use crate::{
    clients::{ark::ArkClient, download::DownloadClient, http},
    decomposition::{
        cache::DecompositionCache,
        types::{
            DecomposeRequest, DecompositionManifest, DecompositionProgress, StagedInput,
            StagedSource,
        },
        validation::{validate_input_image, MAX_INPUT_BYTES},
    },
    diagnostics::{log_identifier, sha256_hex},
    error::CommandError,
};
use std::{path::PathBuf, time::Instant};
use tokio::sync::Semaphore;
use tracing::{error, info, warn};
use uuid::Uuid;

pub(crate) struct DecompositionService {
    ark: ArkClient,
    downloads: DownloadClient,
    cache: DecompositionCache,
    task_gate: Semaphore,
}

impl DecompositionService {
    pub(crate) fn new(cache_root: PathBuf) -> Result<Self, reqwest::Error> {
        let http = http::new_client()?;
        Ok(Self {
            ark: ArkClient::new(http.clone()),
            downloads: DownloadClient::new(http),
            cache: DecompositionCache::new(cache_root),
            task_gate: Semaphore::new(1),
        })
    }

    pub(crate) fn stage_source(&self, bytes: &[u8]) -> Result<StagedSource, CommandError> {
        let (width, height, mime_type) = validate_input_image(bytes, MAX_INPUT_BYTES, true)
            .inspect_err(|error| {
                warn!(
                    bytes = bytes.len(),
                    code = error.code,
                    message = %error.message,
                    "stage_layer_source rejected input",
                );
            })?;
        let source_id = self.cache.stage(StagedInput {
            bytes: bytes.to_vec(),
            width,
            height,
            mime_type,
        })?;
        info!(
            source_id = %source_id,
            mime_type,
            width,
            height,
            bytes = bytes.len(),
            sha256 = %sha256_hex(bytes),
            "staged layer source",
        );
        Ok(StagedSource {
            source_id,
            width,
            height,
        })
    }

    pub(crate) fn discard_source(&self, source_id: &str) -> Result<(), CommandError> {
        self.cache.discard_source(source_id)
    }

    pub(crate) async fn decompose(
        &self,
        request: DecomposeRequest,
        on_progress: impl Fn(DecompositionProgress) + Send + Sync,
    ) -> Result<DecompositionManifest, CommandError> {
        let request_id = Uuid::new_v4().to_string();
        let started_at = Instant::now();
        let source = self
            .cache
            .take_source(&request.source_id)
            .inspect_err(|error| {
                warn!(
                    request_id = %request_id,
                    source_id = %log_identifier(&request.source_id),
                    code = error.code,
                    "decomposition source is missing or expired",
                );
            })?;
        let _permit = self.task_gate.acquire().await.map_err(|_| {
            error!(request_id = %request_id, "decomposition task gate is unavailable");
            CommandError::internal("图层分离服务已关闭")
        })?;
        let prepared =
            self.ark
                .prepare_decomposition(&source, request.prompt, request.size, &request_id)?;
        on_progress(DecompositionProgress::Generating);
        let generated = self.ark.decompose(prepared, &request_id).await?;
        let (job_id, assets) = self
            .cache
            .store_layers(&self.downloads, generated.assets, &on_progress, &request_id)
            .await
            .inspect_err(|error| {
                error!(
                    request_id = %request_id,
                    code = error.code,
                    message = %error.message,
                    elapsed_ms = started_at.elapsed().as_millis() as u64,
                    "layer asset download failed",
                );
            })?;
        info!(
            request_id = %request_id,
            ark_request_id = ?generated.upstream_request_id,
            job_id = %job_id,
            layer_count = assets.len(),
            generated_images = ?generated.usage.as_ref().and_then(|usage| usage.generated_images),
            output_tokens = ?generated.usage.as_ref().and_then(|usage| usage.output_tokens),
            elapsed_ms = started_at.elapsed().as_millis() as u64,
            "layer decomposition completed",
        );
        Ok(DecompositionManifest {
            job_id,
            model: generated.model,
            assets,
            usage: generated.usage,
        })
    }

    pub(crate) async fn read_asset(
        &self,
        job_id: &str,
        asset_id: &str,
    ) -> Result<Vec<u8>, CommandError> {
        self.cache.read_asset(job_id, asset_id).await
    }

    pub(crate) async fn cleanup_job(&self, job_id: &str) -> Result<(), CommandError> {
        self.cache.cleanup_job(job_id).await
    }
}
