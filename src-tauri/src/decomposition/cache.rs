use super::{
    types::{DecompositionProgress, GeneratedLayer, ManifestAsset, StagedInput},
    validation::{validate_bounding_box, validate_png},
};
use crate::{clients::download::DownloadClient, diagnostics::log_identifier, error::CommandError};
use futures_util::{stream::FuturesUnordered, StreamExt};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc, Mutex,
    },
    time::Instant,
};
use tokio::{io::AsyncWriteExt, sync::Semaphore};
use tracing::{debug, info};
use uuid::Uuid;

const MAX_OUTPUT_BYTES: usize = 30 * 1024 * 1024;
const MAX_TOTAL_OUTPUT_BYTES: usize = 200 * 1024 * 1024;
const MAX_CONCURRENT_DOWNLOADS: usize = 4;

pub(crate) struct DecompositionCache {
    root: PathBuf,
    staged_sources: Mutex<HashMap<String, StagedInput>>,
    jobs: Mutex<HashMap<String, CachedJob>>,
}

struct CachedJob {
    directory: PathBuf,
    assets: HashMap<String, CachedAsset>,
}
struct CachedAsset {
    path: PathBuf,
}
struct DownloadedAsset {
    manifest: ManifestAsset,
    cached: CachedAsset,
}

impl DecompositionCache {
    pub(crate) fn new(root: PathBuf) -> Self {
        let _ = std::fs::remove_dir_all(&root);
        Self {
            root,
            staged_sources: Mutex::new(HashMap::new()),
            jobs: Mutex::new(HashMap::new()),
        }
    }

    pub(crate) fn stage(&self, source: StagedInput) -> Result<String, CommandError> {
        let source_id = Uuid::new_v4().to_string();
        let mut staged = self
            .staged_sources
            .lock()
            .map_err(|_| CommandError::internal("无法访问暂存图片"))?;
        // Retain only the latest unconsumed input, as in the single-task UI.
        staged.clear();
        staged.insert(source_id.clone(), source);
        Ok(source_id)
    }

    pub(crate) fn take_source(&self, source_id: &str) -> Result<StagedInput, CommandError> {
        self.staged_sources
            .lock()
            .map_err(|_| CommandError::internal("无法访问暂存图片"))?
            .remove(source_id)
            .ok_or_else(|| CommandError::new("source_expired", "待分离图片已失效，请重试"))
    }

    pub(crate) fn discard_source(&self, source_id: &str) -> Result<(), CommandError> {
        let removed = self
            .staged_sources
            .lock()
            .map_err(|_| CommandError::internal("无法访问暂存图片"))?
            .remove(source_id)
            .is_some();
        debug!(source_id = %log_identifier(source_id), removed, "discarded staged layer source");
        Ok(())
    }

    pub(crate) async fn store_layers(
        &self,
        client: &DownloadClient,
        assets: Vec<GeneratedLayer>,
        on_progress: &(impl Fn(DecompositionProgress) + Send + Sync),
        request_id: &str,
    ) -> Result<(String, Vec<ManifestAsset>), CommandError> {
        let job_id = Uuid::new_v4().to_string();
        let directory = self.root.join(&job_id);
        tokio::fs::create_dir_all(&directory)
            .await
            .map_err(|_| CommandError::internal("无法创建图层缓存目录"))?;
        let result = async {
            let downloaded =
                download_assets(client, assets, &directory, on_progress, request_id).await?;
            let mut manifest = Vec::with_capacity(downloaded.len());
            let mut cached = HashMap::with_capacity(downloaded.len());
            for item in downloaded {
                cached.insert(item.manifest.asset_id.clone(), item.cached);
                manifest.push(item.manifest);
            }
            manifest.sort_by_key(|asset| asset.z_index);
            self.jobs
                .lock()
                .map_err(|_| CommandError::internal("无法登记图层缓存"))?
                .insert(
                    job_id.clone(),
                    CachedJob {
                        directory: directory.clone(),
                        assets: cached,
                    },
                );
            Ok((job_id, manifest))
        }
        .await;
        if result.is_err() {
            let _ = tokio::fs::remove_dir_all(directory).await;
        }
        result
    }

    pub(crate) async fn read_asset(
        &self,
        job_id: &str,
        asset_id: &str,
    ) -> Result<Vec<u8>, CommandError> {
        let path = self
            .jobs
            .lock()
            .map_err(|_| CommandError::internal("无法访问图层缓存"))?
            .get(job_id)
            .and_then(|job| job.assets.get(asset_id))
            .map(|asset| asset.path.clone())
            .ok_or_else(|| CommandError::new("asset_expired", "图层缓存已失效，请重新分离"))?;
        let bytes = tokio::fs::read(path)
            .await
            .map_err(|_| CommandError::new("asset_expired", "无法读取生成图层，请重新分离"))?;
        debug!(
            job_id,
            asset_id,
            bytes = bytes.len(),
            "read cached decomposition asset"
        );
        Ok(bytes)
    }

    pub(crate) async fn cleanup_job(&self, job_id: &str) -> Result<(), CommandError> {
        let job = self
            .jobs
            .lock()
            .map_err(|_| CommandError::internal("无法访问图层缓存"))?
            .remove(job_id);
        if let Some(job) = job {
            let asset_count = job.assets.len();
            tokio::fs::remove_dir_all(job.directory)
                .await
                .map_err(|_| CommandError::internal("无法清理图层缓存"))?;
            debug!(job_id, asset_count, "cleaned decomposition job cache");
        } else {
            debug!(job_id, "decomposition job cache already absent");
        }
        Ok(())
    }
}

async fn download_assets(
    client: &DownloadClient,
    assets: Vec<GeneratedLayer>,
    directory: &Path,
    on_progress: &(impl Fn(DecompositionProgress) + Send + Sync),
    request_id: &str,
) -> Result<Vec<DownloadedAsset>, CommandError> {
    let total = assets.len();
    let mut pending = FuturesUnordered::new();
    let download_gate = Arc::new(Semaphore::new(MAX_CONCURRENT_DOWNLOADS));
    let downloaded_bytes = Arc::new(AtomicUsize::new(0));

    for asset in assets {
        let client = client.clone();
        let directory = directory.to_path_buf();
        let download_gate = download_gate.clone();
        let downloaded_bytes = downloaded_bytes.clone();
        let request_id = request_id.to_string();
        pending.push(async move {
            let _permit = download_gate
                .acquire_owned()
                .await
                .map_err(|_| CommandError::internal("图层下载服务已关闭"))?;
            download_asset(&client, asset, &directory, &downloaded_bytes, &request_id).await
        });
    }

    let mut downloaded = Vec::with_capacity(total);
    while let Some(result) = pending.next().await {
        downloaded.push(result?);
        on_progress(DecompositionProgress::Downloading {
            current: downloaded.len(),
            total,
        });
    }

    Ok(downloaded)
}

async fn download_asset(
    client: &DownloadClient,
    asset: GeneratedLayer,
    directory: &Path,
    downloaded_bytes: &AtomicUsize,
    request_id: &str,
) -> Result<DownloadedAsset, CommandError> {
    let started_at = Instant::now();
    let z_index = asset.z_index;
    let url = asset
        .url
        .as_deref()
        .ok_or_else(|| CommandError::new("invalid_response", "模型结果缺少下载地址"))?;
    let mut response = client
        .open(url, MAX_OUTPUT_BYTES, request_id, z_index)
        .await?;

    validate_bounding_box(asset.z_index, asset.bounding_box.as_ref())?;
    let asset_id = Uuid::new_v4().to_string();
    let path = directory.join(format!("{asset_id}.png"));
    let write_result = async {
        let mut file = tokio::fs::File::create(&path)
            .await
            .map_err(|_| CommandError::internal("无法创建图层缓存文件"))?;
        let mut header = Vec::with_capacity(24);
        let mut received = 0_usize;

        while let Some(chunk) = response.chunk().await? {
            let chunk = chunk.as_ref();
            received = received
                .checked_add(chunk.len())
                .ok_or_else(|| CommandError::new("download_too_large", "生成图层大小无效"))?;
            if received > MAX_OUTPUT_BYTES {
                return Err(CommandError::new(
                    "download_too_large",
                    "生成图层超过 30 MiB 限制",
                ));
            }
            reserve_download_bytes(downloaded_bytes, chunk.len())?;

            if header.len() < 24 {
                let remaining = 24 - header.len();
                header.extend_from_slice(&chunk[..chunk.len().min(remaining)]);
            }
            file.write_all(chunk)
                .await
                .map_err(|_| CommandError::internal("无法缓存生成图层"))?;
        }
        file.flush()
            .await
            .map_err(|_| CommandError::internal("无法缓存生成图层"))?;

        let (width, height) = validate_png(&header, MAX_OUTPUT_BYTES, false)?;
        Ok::<_, CommandError>((width, height, received))
    }
    .await;
    let (width, height, received) = match write_result {
        Ok(dimensions) => dimensions,
        Err(error) => {
            let _ = tokio::fs::remove_file(&path).await;
            return Err(error);
        }
    };

    info!(
        request_id,
        asset_id = %asset_id,
        z_index,
        width,
        height,
        bytes = received,
        elapsed_ms = started_at.elapsed().as_millis() as u64,
        "cached generated layer",
    );

    Ok(DownloadedAsset {
        manifest: ManifestAsset {
            asset_id,
            z_index: asset.z_index,
            width,
            height,
            mime_type: "image/png".to_string(),
            bounding_box: asset.bounding_box,
            name: asset.name,
            description: asset.description,
        },
        cached: CachedAsset { path },
    })
}

fn reserve_download_bytes(total: &AtomicUsize, amount: usize) -> Result<(), CommandError> {
    let result = total.fetch_update(Ordering::Relaxed, Ordering::Relaxed, |current| {
        current
            .checked_add(amount)
            .filter(|next| *next <= MAX_TOTAL_OUTPUT_BYTES)
    });
    if result.is_err() {
        return Err(CommandError::new(
            "download_too_large",
            "生成图层总大小超过 200 MiB 限制",
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn source(bytes: Vec<u8>) -> StagedInput {
        StagedInput {
            bytes,
            width: 1024,
            height: 1024,
            mime_type: "image/png",
        }
    }

    #[test]
    fn replaces_discards_and_consumes_staged_sources_once() {
        let root = std::env::temp_dir().join(format!("swimmeret-decomposition-{}", Uuid::new_v4()));
        let cache = DecompositionCache::new(root);
        let first = cache.stage(source(vec![1, 2])).unwrap();
        let second = cache.stage(source(vec![3, 4])).unwrap();
        assert_eq!(
            cache.take_source(&first).err().unwrap().code,
            "source_expired"
        );
        assert_eq!(cache.take_source(&second).unwrap().bytes, [3, 4]);
        assert_eq!(
            cache.take_source(&second).err().unwrap().code,
            "source_expired"
        );
        let third = cache.stage(source(vec![5, 6])).unwrap();
        cache.discard_source(&third).unwrap();
        cache.discard_source(&third).unwrap();
        assert_eq!(
            cache.take_source(&third).err().unwrap().code,
            "source_expired"
        );
    }

    #[test]
    fn failed_download_leaves_no_registered_job_or_partial_directory() {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(async {
                let root = std::env::temp_dir()
                    .join(format!("swimmeret-decomposition-{}", Uuid::new_v4()));
                let cache = DecompositionCache::new(root.clone());
                let client = DownloadClient::new(crate::clients::http::new_client().unwrap());
                let error = cache
                    .store_layers(
                        &client,
                        vec![GeneratedLayer {
                            url: Some("http://localhost/invalid.png".to_string()),
                            z_index: 0,
                            bounding_box: None,
                            name: None,
                            description: None,
                        }],
                        &|_| panic!("failed download must not report completion"),
                        "test-request",
                    )
                    .await
                    .err()
                    .unwrap();
                assert_eq!(error.code, "invalid_response");
                assert!(cache.jobs.lock().unwrap().is_empty());
                assert!(std::fs::read_dir(&root).unwrap().next().is_none());
                assert_eq!(
                    cache
                        .read_asset("missing", "missing")
                        .await
                        .err()
                        .unwrap()
                        .code,
                    "asset_expired"
                );
                cache.cleanup_job("missing").await.unwrap();
                std::fs::remove_dir(root).unwrap();
            });
    }

    #[test]
    fn enforces_total_download_budget() {
        let total = AtomicUsize::new(MAX_TOTAL_OUTPUT_BYTES - 1);
        assert!(reserve_download_bytes(&total, 1).is_ok());
        assert!(reserve_download_bytes(&total, 1).is_err());
    }
}
