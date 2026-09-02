use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use futures_util::{stream::FuturesUnordered, StreamExt};
use reqwest::{redirect, Client, StatusCode, Url};
use serde::{Deserialize, Serialize};
use tauri::{
    ipc::{Channel, InvokeBody, Request, Response},
    State,
};
use tokio::io::AsyncWriteExt;
use tokio::sync::Semaphore;
use uuid::Uuid;

const ARK_ENDPOINT: &str = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const ARK_MODEL: &str = "doubao-seedream-5-0-pro-260628";
const MAX_INPUT_BYTES: usize = 30 * 1024 * 1024;
const MAX_OUTPUT_BYTES: usize = 30 * 1024 * 1024;
const MAX_TOTAL_OUTPUT_BYTES: usize = 200 * 1024 * 1024;
const MAX_CONCURRENT_DOWNLOADS: usize = 4;
const MIN_INPUT_PIXELS: u64 = 512 * 512;
const MAX_INPUT_PIXELS: u64 = 6_000 * 6_000;
const MAX_PROMPT_CHARS: usize = 4_000;
const MAX_OUTPUT_ITEMS: usize = 17;

pub struct DecompositionState {
    client: Client,
    staged_sources: Mutex<HashMap<String, StagedInput>>,
    jobs: Mutex<HashMap<String, CachedJob>>,
    task_gate: Semaphore,
    cache_root: PathBuf,
}

impl DecompositionState {
    pub fn new(cache_root: PathBuf) -> Result<Self, reqwest::Error> {
        let _ = std::fs::remove_dir_all(&cache_root);

        Ok(Self {
            client: Client::builder()
                .connect_timeout(Duration::from_secs(15))
                .redirect(redirect::Policy::none())
                .timeout(Duration::from_secs(240))
                .build()?,
            staged_sources: Mutex::new(HashMap::new()),
            jobs: Mutex::new(HashMap::new()),
            task_gate: Semaphore::new(1),
            cache_root,
        })
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    code: &'static str,
    message: String,
}

impl CommandError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self::new("internal", message)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StagedSource {
    source_id: String,
    width: u32,
    height: u32,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
pub enum OutputSize {
    #[serde(rename = "auto")]
    Auto,
    #[serde(rename = "1K")]
    OneK,
    #[serde(rename = "1.5K")]
    OneAndHalfK,
    #[serde(rename = "2K")]
    TwoK,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecomposeRequest {
    source_id: String,
    prompt: Option<String>,
    size: OutputSize,
}

#[derive(Clone, Serialize)]
#[serde(tag = "stage", rename_all = "camelCase")]
pub enum DecompositionProgress {
    Generating,
    Downloading { current: usize, total: usize },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecompositionManifest {
    job_id: String,
    model: String,
    assets: Vec<ManifestAsset>,
    usage: Option<ManifestUsage>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestAsset {
    asset_id: String,
    z_index: i32,
    width: u32,
    height: u32,
    mime_type: String,
    bounding_box: Option<BoundingBox>,
    name: Option<String>,
    description: Option<String>,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct BoundingBox {
    absolute: [f64; 4],
    normalized: [f64; 4],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestUsage {
    generated_images: Option<u64>,
    output_tokens: Option<u64>,
    total_tokens: Option<u64>,
}

struct CachedJob {
    directory: PathBuf,
    assets: HashMap<String, CachedAsset>,
}

struct CachedAsset {
    path: PathBuf,
}

struct StagedInput {
    bytes: Vec<u8>,
    mime_type: &'static str,
}

#[derive(Serialize)]
struct ArkRequest {
    model: &'static str,
    image: String,
    size: OutputSize,
    layer_decomposition: bool,
    watermark: bool,
    response_format: &'static str,
    output_format: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    prompt: Option<String>,
}

#[derive(Deserialize)]
struct ArkResponse {
    model: Option<String>,
    data: Vec<ArkAsset>,
    usage: Option<ArkUsage>,
}

#[derive(Clone, Deserialize)]
struct ArkAsset {
    url: Option<String>,
    z_index: i32,
    bounding_box: Option<BoundingBox>,
    name: Option<String>,
    description: Option<String>,
}

#[derive(Deserialize)]
struct ArkUsage {
    generated_images: Option<u64>,
    output_tokens: Option<u64>,
    total_tokens: Option<u64>,
}

struct DownloadedAsset {
    manifest: ManifestAsset,
    cached: CachedAsset,
}

#[tauri::command]
pub fn stage_layer_source(
    request: Request<'_>,
    state: State<'_, DecompositionState>,
) -> Result<StagedSource, CommandError> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(CommandError::new(
            "invalid_input",
            "图层分离需要 PNG 或 JPEG 二进制输入",
        ));
    };
    let (width, height, mime_type) = validate_input_image(bytes, MAX_INPUT_BYTES, true)?;
    let source_id = Uuid::new_v4().to_string();
    let mut staged_sources = state
        .staged_sources
        .lock()
        .map_err(|_| CommandError::internal("无法访问暂存图片"))?;

    // UI 只允许单任务并发；清理未消费输入，避免重复打开对话框积压内存。
    staged_sources.clear();
    staged_sources.insert(
        source_id.clone(),
        StagedInput {
            bytes: bytes.clone(),
            mime_type,
        },
    );

    Ok(StagedSource {
        source_id,
        width,
        height,
    })
}

#[tauri::command]
pub fn discard_layer_source(
    source_id: String,
    state: State<'_, DecompositionState>,
) -> Result<(), CommandError> {
    state
        .staged_sources
        .lock()
        .map_err(|_| CommandError::internal("无法访问暂存图片"))?
        .remove(&source_id);

    Ok(())
}

#[tauri::command]
pub async fn decompose_image(
    request: DecomposeRequest,
    on_progress: Channel<DecompositionProgress>,
    state: State<'_, DecompositionState>,
) -> Result<DecompositionManifest, CommandError> {
    let source = state
        .staged_sources
        .lock()
        .map_err(|_| CommandError::internal("无法访问暂存图片"))?
        .remove(&request.source_id)
        .ok_or_else(|| CommandError::new("source_expired", "待分离图片已失效，请重试"))?;
    let _permit = state
        .task_gate
        .acquire()
        .await
        .map_err(|_| CommandError::internal("图层分离服务已关闭"))?;
    let api_key = std::env::var("ARK_API_KEY")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            CommandError::new(
                "missing_api_key",
                "未配置 ARK_API_KEY，请在启动应用前设置火山引擎 API Key",
            )
        })?;
    let prompt = normalize_prompt(request.prompt)?;
    let _ = on_progress.send(DecompositionProgress::Generating);
    let response = state
        .client
        .post(ARK_ENDPOINT)
        .bearer_auth(api_key)
        .json(&ArkRequest {
            model: ARK_MODEL,
            image: format!(
                "data:{};base64,{}",
                source.mime_type,
                BASE64.encode(&source.bytes)
            ),
            size: request.size,
            layer_decomposition: true,
            watermark: false,
            response_format: "url",
            output_format: "png",
            prompt,
        })
        .send()
        .await
        .map_err(map_network_error)?;
    let status = response.status();
    let body = response.bytes().await.map_err(map_network_error)?;

    if !status.is_success() {
        return Err(map_ark_error(status, &body));
    }

    let ark_response: ArkResponse = serde_json::from_slice(&body)
        .map_err(|_| CommandError::new("invalid_response", "模型返回了无法解析的数据"))?;
    let assets = normalize_ark_assets(ark_response.data)?;
    let job_id = Uuid::new_v4().to_string();
    let job_directory: PathBuf = state.cache_root.join(&job_id);
    tokio::fs::create_dir_all(&job_directory)
        .await
        .map_err(|_| CommandError::internal("无法创建图层缓存目录"))?;

    let download_result =
        download_assets(&state.client, assets, &job_directory, &on_progress).await;
    let downloaded = match download_result {
        Ok(downloaded) => downloaded,
        Err(error) => {
            let _ = tokio::fs::remove_dir_all(&job_directory).await;
            return Err(error);
        }
    };

    let mut manifest_assets = Vec::with_capacity(downloaded.len());
    let mut cached_assets = HashMap::with_capacity(downloaded.len());
    for item in downloaded {
        cached_assets.insert(item.manifest.asset_id.clone(), item.cached);
        manifest_assets.push(item.manifest);
    }
    manifest_assets.sort_by_key(|asset| asset.z_index);
    state
        .jobs
        .lock()
        .map_err(|_| CommandError::internal("无法登记图层缓存"))?
        .insert(
            job_id.clone(),
            CachedJob {
                directory: job_directory,
                assets: cached_assets,
            },
        );

    Ok(DecompositionManifest {
        job_id,
        model: ark_response.model.unwrap_or_else(|| ARK_MODEL.to_string()),
        assets: manifest_assets,
        usage: ark_response.usage.map(|usage| ManifestUsage {
            generated_images: usage.generated_images,
            output_tokens: usage.output_tokens,
            total_tokens: usage.total_tokens,
        }),
    })
}

#[tauri::command]
pub async fn read_decomposition_asset(
    job_id: String,
    asset_id: String,
    state: State<'_, DecompositionState>,
) -> Result<Response, CommandError> {
    let path = state
        .jobs
        .lock()
        .map_err(|_| CommandError::internal("无法访问图层缓存"))?
        .get(&job_id)
        .and_then(|job| job.assets.get(&asset_id))
        .map(|asset| asset.path.clone())
        .ok_or_else(|| CommandError::new("asset_expired", "图层缓存已失效，请重新分离"))?;
    let bytes = tokio::fs::read(path)
        .await
        .map_err(|_| CommandError::new("asset_expired", "无法读取生成图层，请重新分离"))?;

    Ok(Response::new(bytes))
}

#[tauri::command]
pub async fn cleanup_decomposition_job(
    job_id: String,
    state: State<'_, DecompositionState>,
) -> Result<(), CommandError> {
    let job = state
        .jobs
        .lock()
        .map_err(|_| CommandError::internal("无法访问图层缓存"))?
        .remove(&job_id);
    if let Some(job) = job {
        tokio::fs::remove_dir_all(job.directory)
            .await
            .map_err(|_| CommandError::internal("无法清理图层缓存"))?;
    }

    Ok(())
}

async fn download_assets(
    client: &Client,
    assets: Vec<ArkAsset>,
    directory: &std::path::Path,
    on_progress: &Channel<DecompositionProgress>,
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
        pending.push(async move {
            let _permit = download_gate
                .acquire_owned()
                .await
                .map_err(|_| CommandError::internal("图层下载服务已关闭"))?;
            download_asset(&client, asset, &directory, &downloaded_bytes).await
        });
    }

    let mut downloaded = Vec::with_capacity(total);
    while let Some(result) = pending.next().await {
        downloaded.push(result?);
        let _ = on_progress.send(DecompositionProgress::Downloading {
            current: downloaded.len(),
            total,
        });
    }

    Ok(downloaded)
}

async fn download_asset(
    client: &Client,
    asset: ArkAsset,
    directory: &std::path::Path,
    downloaded_bytes: &AtomicUsize,
) -> Result<DownloadedAsset, CommandError> {
    let url = asset
        .url
        .as_deref()
        .ok_or_else(|| CommandError::new("invalid_response", "模型结果缺少下载地址"))?;
    let parsed_url = validate_download_url(url)?;
    let mut response = client
        .get(parsed_url)
        .send()
        .await
        .map_err(map_network_error)?;
    if !response.status().is_success() {
        return Err(CommandError::new(
            "download_failed",
            format!("下载生成图层失败（HTTP {}）", response.status().as_u16()),
        ));
    }
    if response
        .content_length()
        .is_some_and(|length| length > MAX_OUTPUT_BYTES as u64)
    {
        return Err(CommandError::new(
            "download_too_large",
            "生成图层超过 30 MiB 限制",
        ));
    }

    validate_bounding_box(asset.z_index, asset.bounding_box.as_ref())?;
    let asset_id = Uuid::new_v4().to_string();
    let path = directory.join(format!("{asset_id}.png"));
    let write_result = async {
        let mut file = tokio::fs::File::create(&path)
            .await
            .map_err(|_| CommandError::internal("无法创建图层缓存文件"))?;
        let mut header = Vec::with_capacity(24);
        let mut received = 0_usize;

        while let Some(chunk) = response.chunk().await.map_err(map_network_error)? {
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
            file.write_all(&chunk)
                .await
                .map_err(|_| CommandError::internal("无法缓存生成图层"))?;
        }
        file.flush()
            .await
            .map_err(|_| CommandError::internal("无法缓存生成图层"))?;

        validate_png(&header, MAX_OUTPUT_BYTES, false)
    }
    .await;
    let (width, height) = match write_result {
        Ok(dimensions) => dimensions,
        Err(error) => {
            let _ = tokio::fs::remove_file(&path).await;
            return Err(error);
        }
    };

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

fn validate_download_url(url: &str) -> Result<Url, CommandError> {
    let parsed = Url::parse(url)
        .map_err(|_| CommandError::new("invalid_response", "模型返回了无效下载地址"))?;
    let host = parsed
        .host_str()
        .ok_or_else(|| CommandError::new("invalid_response", "模型下载地址缺少主机名"))?
        .to_ascii_lowercase();
    let is_local_host = host == "localhost"
        || host.ends_with(".localhost")
        || host.ends_with(".local")
        || host.ends_with(".internal")
        || host.parse::<std::net::IpAddr>().is_ok();

    if parsed.scheme() != "https"
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.port_or_known_default() != Some(443)
        || is_local_host
    {
        return Err(CommandError::new(
            "invalid_response",
            "模型返回了不安全的下载地址",
        ));
    }

    Ok(parsed)
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

fn normalize_ark_assets(mut assets: Vec<ArkAsset>) -> Result<Vec<ArkAsset>, CommandError> {
    if assets.is_empty() || assets.len() > MAX_OUTPUT_ITEMS {
        return Err(CommandError::new(
            "invalid_response",
            "模型返回的图层数量不合法",
        ));
    }
    assets.sort_by_key(|asset| asset.z_index);
    if assets[0].z_index != 0
        || assets
            .windows(2)
            .any(|pair| pair[0].z_index >= pair[1].z_index)
    {
        return Err(CommandError::new(
            "invalid_response",
            "模型返回的图层顺序不合法",
        ));
    }

    Ok(assets)
}

fn normalize_prompt(prompt: Option<String>) -> Result<Option<String>, CommandError> {
    let Some(prompt) = prompt else {
        return Ok(None);
    };
    let prompt = prompt.trim();
    if prompt.is_empty() {
        return Ok(None);
    }
    if prompt.chars().count() > MAX_PROMPT_CHARS {
        return Err(CommandError::new(
            "invalid_input",
            format!("拆分描述不能超过 {MAX_PROMPT_CHARS} 个字符"),
        ));
    }

    Ok(Some(prompt.to_string()))
}

fn validate_png(
    bytes: &[u8],
    max_bytes: usize,
    validate_api_dimensions: bool,
) -> Result<(u32, u32), CommandError> {
    const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";
    if bytes.len() > max_bytes {
        return Err(CommandError::new(
            "invalid_input",
            format!("图片不能超过 {} MiB", max_bytes / 1024 / 1024),
        ));
    }
    if bytes.len() < 24 || &bytes[..8] != PNG_SIGNATURE || &bytes[12..16] != b"IHDR" {
        return Err(CommandError::new(
            "invalid_input",
            "图片不是有效的 PNG 文件",
        ));
    }
    let width = u32::from_be_bytes(bytes[16..20].try_into().expect("PNG width slice"));
    let height = u32::from_be_bytes(bytes[20..24].try_into().expect("PNG height slice"));
    if width == 0 || height == 0 {
        return Err(CommandError::new("invalid_input", "图片尺寸无效"));
    }

    if validate_api_dimensions {
        let pixels = u64::from(width) * u64::from(height);
        let ratio = f64::from(width) / f64::from(height);
        if !(MIN_INPUT_PIXELS..=MAX_INPUT_PIXELS).contains(&pixels)
            || !(1.0 / 16.0..=16.0).contains(&ratio)
        {
            return Err(CommandError::new(
                "invalid_input",
                "图片像素或宽高比不符合 Seedream 图层分离要求",
            ));
        }
    }

    Ok((width, height))
}

fn validate_input_image(
    bytes: &[u8],
    max_bytes: usize,
    validate_api_dimensions: bool,
) -> Result<(u32, u32, &'static str), CommandError> {
    const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";

    if bytes.starts_with(PNG_SIGNATURE) {
        let (width, height) = validate_png(bytes, max_bytes, validate_api_dimensions)?;
        return Ok((width, height, "image/png"));
    }

    let (width, height) = validate_jpeg(bytes, max_bytes, validate_api_dimensions)?;
    Ok((width, height, "image/jpeg"))
}

fn validate_jpeg(
    bytes: &[u8],
    max_bytes: usize,
    validate_api_dimensions: bool,
) -> Result<(u32, u32), CommandError> {
    if bytes.len() > max_bytes {
        return Err(CommandError::new(
            "invalid_input",
            format!("图片不能超过 {} MiB", max_bytes / 1024 / 1024),
        ));
    }
    if bytes.len() < 2 || bytes[..2] != [0xff, 0xd8] {
        return Err(CommandError::new(
            "invalid_input",
            "图片必须是有效的 PNG 或 JPEG 文件",
        ));
    }

    let mut offset = 2;
    while offset < bytes.len() {
        while offset < bytes.len() && bytes[offset] == 0xff {
            offset += 1;
        }
        if offset >= bytes.len() {
            break;
        }

        let marker = bytes[offset];
        offset += 1;
        if marker == 0xd9 || marker == 0xda {
            break;
        }
        if (0xd0..=0xd7).contains(&marker) || marker == 0x01 {
            continue;
        }
        if offset + 2 > bytes.len() {
            break;
        }

        let segment_length = usize::from(u16::from_be_bytes([bytes[offset], bytes[offset + 1]]));
        if segment_length < 2 || offset + segment_length > bytes.len() {
            break;
        }

        if is_jpeg_start_of_frame(marker) {
            if segment_length < 7 {
                break;
            }
            let height = u32::from(u16::from_be_bytes([bytes[offset + 3], bytes[offset + 4]]));
            let width = u32::from(u16::from_be_bytes([bytes[offset + 5], bytes[offset + 6]]));
            if width == 0 || height == 0 {
                return Err(CommandError::new("invalid_input", "图片尺寸无效"));
            }
            validate_image_dimensions(width, height, validate_api_dimensions)?;
            return Ok((width, height));
        }

        offset += segment_length;
    }

    Err(CommandError::new(
        "invalid_input",
        "图片必须是有效的 PNG 或 JPEG 文件",
    ))
}

fn is_jpeg_start_of_frame(marker: u8) -> bool {
    matches!(
        marker,
        0xc0..=0xc3 | 0xc5..=0xc7 | 0xc9..=0xcb | 0xcd..=0xcf
    )
}

fn validate_image_dimensions(
    width: u32,
    height: u32,
    validate_api_dimensions: bool,
) -> Result<(), CommandError> {
    if !validate_api_dimensions {
        return Ok(());
    }

    let pixels = u64::from(width) * u64::from(height);
    let ratio = f64::from(width) / f64::from(height);
    if !(MIN_INPUT_PIXELS..=MAX_INPUT_PIXELS).contains(&pixels)
        || !(1.0 / 16.0..=16.0).contains(&ratio)
    {
        return Err(CommandError::new(
            "invalid_input",
            "图片像素或宽高比不符合 Seedream 图层分离要求",
        ));
    }

    Ok(())
}

fn validate_bounding_box(
    z_index: i32,
    bounding_box: Option<&BoundingBox>,
) -> Result<(), CommandError> {
    let Some(bounding_box) = bounding_box else {
        if z_index == 0 {
            return Ok(());
        }
        return Err(CommandError::new(
            "invalid_response",
            "生成图层缺少边界信息",
        ));
    };
    let [left, top, right, bottom] = bounding_box.normalized;
    let [absolute_left, absolute_top, absolute_right, absolute_bottom] = bounding_box.absolute;
    if ![left, top, right, bottom]
        .iter()
        .all(|value| value.is_finite() && (0.0..=1000.0).contains(value))
        || left >= right
        || top >= bottom
    {
        return Err(CommandError::new(
            "invalid_response",
            "生成图层的边界信息无效",
        ));
    }
    if ![absolute_left, absolute_top, absolute_right, absolute_bottom]
        .iter()
        .all(|value| value.is_finite() && (0.0..=24_000.0).contains(value))
        || absolute_left >= absolute_right
        || absolute_top >= absolute_bottom
    {
        return Err(CommandError::new(
            "invalid_response",
            "生成图层的绝对边界信息无效",
        ));
    }

    Ok(())
}

fn map_network_error(error: reqwest::Error) -> CommandError {
    if error.is_timeout() {
        CommandError::new("timeout", "图层分离请求超时，请稍后重试")
    } else {
        CommandError::new("network", format!("网络请求失败：{error}"))
    }
}

fn map_ark_error(status: StatusCode, body: &[u8]) -> CommandError {
    let upstream_message = serde_json::from_slice::<serde_json::Value>(body)
        .ok()
        .and_then(|value| {
            value
                .pointer("/error/message")
                .or_else(|| value.get("message"))
                .and_then(serde_json::Value::as_str)
                .map(str::to_string)
        });
    let (code, fallback) = match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
            ("authentication", "火山引擎 API Key 无效或无权访问该模型")
        }
        StatusCode::TOO_MANY_REQUESTS => ("rate_limited", "请求过于频繁，请稍后重试"),
        StatusCode::BAD_REQUEST => ("invalid_request", "模型拒绝了当前图片或参数"),
        _ => ("upstream", "火山引擎服务暂时不可用"),
    };

    CommandError::new(
        code,
        upstream_message.unwrap_or_else(|| fallback.to_string()),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn png_header(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = vec![0_u8; 24];
        bytes[..8].copy_from_slice(b"\x89PNG\r\n\x1a\n");
        bytes[12..16].copy_from_slice(b"IHDR");
        bytes[16..20].copy_from_slice(&width.to_be_bytes());
        bytes[20..24].copy_from_slice(&height.to_be_bytes());
        bytes
    }

    fn jpeg_header(width: u16, height: u16) -> Vec<u8> {
        vec![
            0xff,
            0xd8, // SOI
            0xff,
            0xc0, // SOF0
            0x00,
            0x0b, // segment length
            0x08, // precision
            (height >> 8) as u8,
            height as u8,
            (width >> 8) as u8,
            width as u8,
            0x03,
            0x01,
            0x11,
            0x00,
            0xff,
            0xd9, // EOI
        ]
    }

    #[test]
    fn validates_supported_png_dimensions() {
        assert_eq!(
            validate_png(&png_header(1024, 1024), 1024, true).unwrap(),
            (1024, 1024)
        );
    }

    #[test]
    fn validates_supported_jpeg_dimensions() {
        assert_eq!(
            validate_input_image(&jpeg_header(1024, 1024), 1024, true).unwrap(),
            (1024, 1024, "image/jpeg")
        );
    }

    #[test]
    fn rejects_too_small_png() {
        let error = validate_png(&png_header(128, 128), 1024, true).unwrap_err();
        assert_eq!(error.code, "invalid_input");
    }

    #[test]
    fn normalizes_empty_prompt() {
        assert_eq!(normalize_prompt(Some("   ".to_string())).unwrap(), None);
    }

    #[test]
    fn rejects_duplicate_z_indexes() {
        let assets = vec![
            ArkAsset {
                url: Some("https://example.com/base.png".to_string()),
                z_index: 0,
                bounding_box: None,
                name: None,
                description: None,
            },
            ArkAsset {
                url: Some("https://example.com/layer.png".to_string()),
                z_index: 0,
                bounding_box: None,
                name: None,
                description: None,
            },
        ];

        assert!(normalize_ark_assets(assets).is_err());
    }

    #[test]
    fn validates_safe_download_urls() {
        assert!(validate_download_url("https://example.com/layer.png").is_ok());
        assert!(validate_download_url("http://example.com/layer.png").is_err());
        assert!(validate_download_url("https://localhost/layer.png").is_err());
        assert!(validate_download_url("https://127.0.0.1/layer.png").is_err());
        assert!(validate_download_url("https://user@example.com/layer.png").is_err());
        assert!(validate_download_url("https://example.com:8443/layer.png").is_err());
    }

    #[test]
    fn enforces_total_download_budget() {
        let total = AtomicUsize::new(MAX_TOTAL_OUTPUT_BYTES - 1);
        assert!(reserve_download_bytes(&total, 1).is_ok());
        assert!(reserve_download_bytes(&total, 1).is_err());
    }

    #[test]
    fn validates_bounding_box_coordinate_sets() {
        let valid = BoundingBox {
            absolute: [0.0, 0.0, 1024.0, 1024.0],
            normalized: [0.0, 0.0, 1000.0, 1000.0],
        };
        let invalid_absolute = BoundingBox {
            absolute: [1024.0, 0.0, 0.0, 1024.0],
            normalized: [0.0, 0.0, 1000.0, 1000.0],
        };

        assert!(validate_bounding_box(1, Some(&valid)).is_ok());
        assert!(validate_bounding_box(1, Some(&invalid_absolute)).is_err());
        assert!(validate_bounding_box(1, None).is_err());
        assert!(validate_bounding_box(0, None).is_ok());
    }
}
