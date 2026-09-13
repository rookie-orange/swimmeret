use super::http::{map_network_error, network_error_kind};
use crate::{
    decomposition::types::{
        BoundingBox, GeneratedLayer, GeneratedLayers, ManifestUsage, OutputSize, StagedInput,
    },
    diagnostics::sha256_hex,
    error::CommandError,
    image_generation::GenerateImageRequest,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use reqwest::{header::CONTENT_TYPE, Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tracing::{error, info, warn};

const ARK_ENDPOINT: &str = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const ARK_MODEL: &str = "doubao-seedream-5-0-pro-260628";
const MAX_PROMPT_CHARS: usize = 4_000;
const MAX_OUTPUT_ITEMS: usize = 17;

pub(crate) struct ArkClient {
    http: Client,
    endpoint: String,
}

// Do not derive Debug: this value holds the API key.
pub(crate) struct LayerRequest {
    api_key: String,
    payload: ArkRequest,
}

pub(crate) struct ImageRequest {
    api_key: String,
    payload: ImageGenerationPayload,
}

pub(crate) struct GeneratedImage {
    pub(crate) model: String,
    pub(crate) url: String,
    pub(crate) request_id: Option<String>,
}

impl ArkClient {
    pub(crate) fn new(http: Client) -> Self {
        Self {
            http,
            endpoint: ARK_ENDPOINT.to_string(),
        }
    }

    pub(crate) fn prepare_decomposition(
        &self,
        source: &StagedInput,
        prompt: Option<String>,
        size: OutputSize,
        request_id: &str,
    ) -> Result<LayerRequest, CommandError> {
        let api_key = self.api_key(request_id)?;
        let prompt = match normalize_prompt(prompt) {
            Ok(prompt) => prompt,
            Err(error) => {
                warn!(
                    request_id = %request_id,
                    code = error.code,
                    message = %error.message,
                    "decomposition prompt rejected",
                );
                return Err(error);
            }
        };
        let image_data_uri_prefix = format!("data:{};base64,", source.mime_type);
        let image = format!("{}{}", image_data_uri_prefix, BASE64.encode(&source.bytes));
        let image_data_uri_chars = image.len();
        let base64_chars = image_data_uri_chars - image_data_uri_prefix.len();
        let ark_request = ArkRequest {
            model: ARK_MODEL,
            image,
            size,
            layer_decomposition: true,
            watermark: false,
            response_format: "url",
            output_format: "png",
            prompt,
        };
        info!(
            request_id = %request_id,
            endpoint = %self.endpoint,
            model = ARK_MODEL,
            mime_type = source.mime_type,
            width = source.width,
            height = source.height,
            bytes = source.bytes.len(),
            sha256 = %sha256_hex(&source.bytes),
            base64_chars,
            image_data_uri_chars,
            image_data_uri_prefix,
            size = output_size_label(size),
            layer_decomposition = true,
            output_format = "png",
            response_format = "url",
            watermark = false,
            prompt_present = ark_request.prompt.is_some(),
            prompt_chars = ark_request
                .prompt
                .as_ref()
                .map_or(0, |value| value.chars().count()),
            "starting layer decomposition",
        );
        Ok(LayerRequest {
            api_key,
            payload: ark_request,
        })
    }

    pub(crate) fn prepare_image_generation(
        &self,
        request: GenerateImageRequest,
        request_id: &str,
    ) -> Result<ImageRequest, CommandError> {
        let payload = ImageGenerationPayload::new(request)?;
        let api_key = self.api_key(request_id)?;
        info!(
            request_id = %request_id,
            endpoint = %self.endpoint,
            model = ARK_MODEL,
            size = ?payload.size,
            prompt_chars = payload.prompt.chars().count(),
            "starting text to image generation",
        );
        Ok(ImageRequest { api_key, payload })
    }

    pub(crate) async fn generate_image(
        &self,
        request: ImageRequest,
        request_id: &str,
    ) -> Result<GeneratedImage, CommandError> {
        let started_at = Instant::now();
        let response = self
            .http
            .post(&self.endpoint)
            .bearer_auth(&request.api_key)
            .json(&request.payload)
            .send()
            .await
            .map_err(|error| {
                let mapped = map_network_error(error);
                error!(
                    request_id = %request_id,
                    code = mapped.code,
                    message = %mapped.message,
                    elapsed_ms = started_at.elapsed().as_millis() as u64,
                    "Seedream text to image request failed",
                );
                mapped
            })?;
        let status = response.status();
        let upstream_request_id = upstream_request_id(&response);
        let body = response.bytes().await.map_err(|error| {
            let mapped = map_network_error(error);
            error!(
                request_id = %request_id,
                code = mapped.code,
                message = %mapped.message,
                "failed to read Seedream text to image response",
            );
            mapped
        })?;
        if !status.is_success() {
            return Err(map_ark_error(status, &body));
        }
        let response: ImageGenerationResponse = serde_json::from_slice(&body).map_err(|error| {
            error!(request_id = %request_id, error = %error, "invalid Seedream text to image response");
            CommandError::new("invalid_response", "模型返回了无法解析的数据")
        })?;
        if response.data.len() != 1 {
            return Err(CommandError::new(
                "invalid_response",
                "模型未返回单张生成图片",
            ));
        }
        let asset = response
            .data
            .into_iter()
            .next()
            .expect("one image checked above");
        if let Some(error) = asset.error {
            return Err(CommandError::new(
                "upstream",
                error
                    .message
                    .unwrap_or_else(|| "模型生成图片失败，请调整描述后重试".to_string()),
            ));
        }
        let image = asset
            .url
            .filter(|url| !url.trim().is_empty())
            .ok_or_else(|| CommandError::new("invalid_response", "模型没有返回生成图片地址"))?;
        Ok(GeneratedImage {
            model: response.model.unwrap_or_else(|| ARK_MODEL.to_string()),
            url: image,
            request_id: upstream_request_id,
        })
    }

    fn api_key(&self, request_id: &str) -> Result<String, CommandError> {
        std::env::var("ARK_API_KEY")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| {
                error!(request_id = %request_id, "ARK_API_KEY is missing or empty");
                CommandError::new(
                    "missing_api_key",
                    "未配置 ARK_API_KEY，请在启动应用前设置火山引擎 API Key",
                )
            })
    }

    pub(crate) async fn decompose(
        &self,
        request: LayerRequest,
        request_id: &str,
    ) -> Result<GeneratedLayers, CommandError> {
        let started_at = Instant::now();
        let response = match self
            .http
            .post(&self.endpoint)
            .bearer_auth(&request.api_key)
            .json(&request.payload)
            .send()
            .await
        {
            Ok(response) => response,
            Err(error) => {
                let network_kind = network_error_kind(&error);
                let mapped = map_network_error(error);
                error!(
                    request_id = %request_id,
                    network_kind,
                    code = mapped.code,
                    message = %mapped.message,
                    elapsed_ms = started_at.elapsed().as_millis() as u64,
                    "Ark request failed before receiving a response",
                );
                return Err(mapped);
            }
        };
        let status = response.status();
        let ark_request_id = upstream_request_id(&response);
        let response_content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .map(str::to_string);
        let body = match response.bytes().await {
            Ok(body) => body,
            Err(error) => {
                let network_kind = network_error_kind(&error);
                let mapped = map_network_error(error);
                error!(
                    request_id = %request_id,
                    ark_request_id = ?ark_request_id,
                    network_kind,
                    code = mapped.code,
                    message = %mapped.message,
                    elapsed_ms = started_at.elapsed().as_millis() as u64,
                    "failed to read Ark response body",
                );
                return Err(mapped);
            }
        };

        info!(
            request_id = %request_id,
            ark_request_id = ?ark_request_id,
            http_status = status.as_u16(),
            content_type = ?response_content_type,
            response_bytes = body.len(),
            elapsed_ms = started_at.elapsed().as_millis() as u64,
            "received Ark response",
        );

        if !status.is_success() {
            let mapped = map_ark_error(status, &body);
            let ark_error_code = ark_error_code(&body);
            error!(
                request_id = %request_id,
                ark_request_id = ?ark_request_id,
                ark_error_code = ?ark_error_code,
                code = mapped.code,
                message = %mapped.message,
                response_bytes = body.len(),
                response_sha256 = %sha256_hex(&body),
                "Ark rejected layer decomposition request",
            );
            return Err(mapped);
        }

        let ark_response: ArkResponse = match serde_json::from_slice(&body) {
            Ok(response) => response,
            Err(parse_error) => {
                error!(
                    request_id = %request_id,
                    ark_request_id = ?ark_request_id,
                    error = %parse_error,
                    response_bytes = body.len(),
                    response_sha256 = %sha256_hex(&body),
                    "failed to parse Ark response JSON",
                );
                return Err(CommandError::new(
                    "invalid_response",
                    "模型返回了无法解析的数据",
                ));
            }
        };
        let assets = match normalize_ark_assets(ark_response.data) {
            Ok(assets) => assets,
            Err(validation_error) => {
                error!(
                    request_id = %request_id,
                    ark_request_id = ?ark_request_id,
                    code = validation_error.code,
                    message = %validation_error.message,
                    "Ark response contained invalid layer metadata",
                );
                return Err(validation_error);
            }
        };
        info!(
            request_id = %request_id,
            ark_request_id = ?ark_request_id,
            model = ark_response.model.as_deref().unwrap_or(ARK_MODEL),
            layer_count = assets.len(),
            z_indexes = ?assets.iter().map(|asset| asset.z_index).collect::<Vec<_>>(),
            "validated Ark layer manifest",
        );
        Ok(GeneratedLayers {
            model: ark_response.model.unwrap_or_else(|| ARK_MODEL.to_string()),
            assets: assets
                .into_iter()
                .map(|asset| GeneratedLayer {
                    url: asset.url,
                    z_index: asset.z_index,
                    bounding_box: asset.bounding_box,
                    name: asset.name,
                    description: asset.description,
                })
                .collect(),
            usage: ark_response.usage.map(|usage| ManifestUsage {
                generated_images: usage.generated_images,
                output_tokens: usage.output_tokens,
                total_tokens: usage.total_tokens,
            }),
            upstream_request_id: ark_request_id,
        })
    }
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

#[derive(Serialize)]
struct ImageGenerationPayload {
    model: &'static str,
    prompt: String,
    size: String,
    response_format: &'static str,
    output_format: &'static str,
    watermark: bool,
}

impl ImageGenerationPayload {
    fn new(request: GenerateImageRequest) -> Result<Self, CommandError> {
        let size = request.output_size();
        Ok(Self {
            model: ARK_MODEL,
            prompt: normalize_required_prompt(request.prompt)?,
            size,
            response_format: "url",
            output_format: "png",
            watermark: false,
        })
    }
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

#[derive(Deserialize)]
struct ImageGenerationResponse {
    model: Option<String>,
    data: Vec<ImageGenerationAsset>,
}

#[derive(Deserialize)]
struct ImageGenerationAsset {
    url: Option<String>,
    error: Option<ImageGenerationError>,
}

#[derive(Deserialize)]
struct ImageGenerationError {
    message: Option<String>,
}

fn ark_error_code(body: &[u8]) -> Option<String> {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()
        .and_then(|value| {
            value
                .pointer("/error/code")
                .or_else(|| value.get("code"))
                .and_then(serde_json::Value::as_str)
                .map(str::to_string)
        })
}

fn upstream_request_id(response: &reqwest::Response) -> Option<String> {
    ["x-request-id", "x-tt-logid", "x-log-id"]
        .iter()
        .find_map(|name| {
            response
                .headers()
                .get(*name)
                .and_then(|value| value.to_str().ok())
                .map(str::to_string)
        })
}

fn output_size_label(size: OutputSize) -> &'static str {
    match size {
        OutputSize::Auto => "auto",
        OutputSize::OneK => "1K",
        OutputSize::OneAndHalfK => "1.5K",
        OutputSize::TwoK => "2K",
    }
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

fn normalize_required_prompt(prompt: String) -> Result<String, CommandError> {
    let prompt = prompt.trim();
    if prompt.is_empty() {
        return Err(CommandError::new("invalid_input", "请输入图片描述"));
    }
    if prompt.chars().count() > MAX_PROMPT_CHARS {
        return Err(CommandError::new(
            "invalid_input",
            format!("图片描述不能超过 {MAX_PROMPT_CHARS} 个字符"),
        ));
    }
    Ok(prompt.to_string())
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
    use std::{
        io::{Read, Write},
        net::TcpListener,
        thread,
        time::Duration,
    };

    // Exercise real HTTP and Serde boundaries using a fake key and a local server.
    // This helper never reads the developer's environment or calls Ark.
    fn exchange_with<T, F, Fut>(
        status: &str,
        body: &str,
        run: F,
    ) -> (Result<T, CommandError>, String)
    where
        F: FnOnce(ArkClient) -> Fut,
        Fut: std::future::Future<Output = Result<T, CommandError>>,
    {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = format!(
            "http://{}/images/generations",
            listener.local_addr().unwrap()
        );
        listener.set_nonblocking(true).unwrap();
        let response = format!(
            "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nX-Tt-Logid: test-upstream-id\r\nConnection: close\r\n\r\n{body}",
            body.len(),
        );
        let server = thread::spawn(move || {
            let deadline = Instant::now() + Duration::from_secs(5);
            let mut socket = loop {
                match listener.accept() {
                    Ok((socket, _)) => break socket,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        assert!(Instant::now() < deadline, "test HTTP request never arrived");
                        thread::sleep(Duration::from_millis(5));
                    }
                    Err(error) => panic!("test server failed: {error}"),
                }
            };
            socket.set_nonblocking(false).unwrap();
            socket
                .set_read_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            socket
                .set_write_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            let mut bytes = Vec::new();
            loop {
                let mut buffer = [0; 1024];
                let count = socket.read(&mut buffer).unwrap();
                assert!(count > 0, "incomplete HTTP request");
                bytes.extend_from_slice(&buffer[..count]);
                assert!(bytes.len() < 64 * 1024);
                if let Some(end) = bytes.windows(4).position(|part| part == b"\r\n\r\n") {
                    let headers = String::from_utf8_lossy(&bytes[..end]).to_ascii_lowercase();
                    let length: usize = headers
                        .lines()
                        .find_map(|line| line.strip_prefix("content-length: "))
                        .unwrap()
                        .trim()
                        .parse()
                        .unwrap();
                    if bytes.len() >= end + 4 + length {
                        break;
                    }
                }
            }
            socket.write_all(response.as_bytes()).unwrap();
            String::from_utf8(bytes).unwrap()
        });
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let result = runtime.block_on(async {
            let http = Client::builder()
                .no_proxy()
                .timeout(Duration::from_secs(5))
                .build()
                .unwrap();
            let client = ArkClient { http, endpoint };
            run(client).await
        });
        (result, server.join().unwrap())
    }

    fn exchange(status: &str, body: &str) -> (Result<GeneratedLayers, CommandError>, String) {
        exchange_with(status, body, |client| async move {
            client
                .decompose(
                    LayerRequest {
                        api_key: "test-key".to_string(),
                        payload: ArkRequest {
                            model: ARK_MODEL,
                            image: "data:image/png;base64,dGVzdA==".to_string(),
                            size: OutputSize::OneAndHalfK,
                            layer_decomposition: true,
                            watermark: false,
                            response_format: "url",
                            output_format: "png",
                            prompt: None,
                        },
                    },
                    "test-request-id",
                )
                .await
        })
    }

    fn generate_exchange(
        status: &str,
        body: &str,
    ) -> (Result<GeneratedImage, CommandError>, String) {
        exchange_with(status, body, |client| async move {
            client
                .generate_image(
                    ImageRequest {
                        api_key: "test-key".to_string(),
                        payload: ImageGenerationPayload::new(GenerateImageRequest {
                            prompt: "  山间的小屋  ".to_string(),
                            size: crate::image_generation::ImageGenerationSize::TwoK,
                            aspect_ratio: Default::default(),
                        })
                        .unwrap(),
                    },
                    "test-generation-id",
                )
                .await
        })
    }

    #[test]
    fn generates_single_png_with_pro_model() {
        let (result, request) = generate_exchange(
            "200 OK",
            r#"{"data":[{"url":"https://example.com/generated.png"}]}"#,
        );
        let (headers, body) = request.split_once("\r\n\r\n").unwrap();
        assert!(headers.starts_with("POST /images/generations HTTP/1.1"));
        assert!(headers
            .to_ascii_lowercase()
            .contains("authorization: bearer test-key"));
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(body).unwrap(),
            serde_json::json!({
                "model": "doubao-seedream-5-0-pro-260628",
                "prompt": "山间的小屋",
                "size": "2K",
                "output_format": "png",
                "response_format": "url",
                "watermark": false
            })
        );
        let image = result.unwrap();
        assert_eq!(image.url, "https://example.com/generated.png");
        assert_eq!(image.model, ARK_MODEL);
        assert_eq!(image.request_id.as_deref(), Some("test-upstream-id"));
    }

    #[test]
    fn rejects_invalid_generation_responses_and_maps_failures() {
        for (status, body, code) in [
            ("200 OK", "not json", "invalid_response"),
            ("200 OK", r#"{"data":[]}"#, "invalid_response"),
            ("200 OK", r#"{"data":[{}]}"#, "invalid_response"),
            ("200 OK", r#"{"data":[{"url":" "}]}"#, "invalid_response"),
            (
                "200 OK",
                r#"{"data":[{"url":"https://example.com/a"},{"url":"https://example.com/b"}]}"#,
                "invalid_response",
            ),
            (
                "200 OK",
                r#"{"data":[{"error":{"code":"OutputImageSensitiveContentDetected","message":"blocked output"}}]}"#,
                "upstream",
            ),
            ("401 Unauthorized", "{}", "authentication"),
            ("429 Too Many Requests", "{}", "rate_limited"),
            ("500 Internal Server Error", "{}", "upstream"),
        ] {
            let error = generate_exchange(status, body)
                .0
                .err()
                .expect("must reject response");
            assert_eq!(error.code, code);
        }
        let error = generate_exchange(
            "200 OK",
            r#"{"data":[{"error":{"message":"blocked output"}}]}"#,
        )
        .0
        .err()
        .unwrap();
        assert_eq!(error.message, "blocked output");
    }

    #[test]
    fn validates_generation_prompt_and_size_without_credentials() {
        for prompt in ["  ".to_string(), "猫".repeat(4001)] {
            let result = ImageGenerationPayload::new(GenerateImageRequest {
                prompt,
                size: crate::image_generation::ImageGenerationSize::TwoK,
                aspect_ratio: Default::default(),
            });
            assert_eq!(result.err().unwrap().code, "invalid_input");
        }
        assert!(normalize_required_prompt("猫".repeat(4000)).is_ok());
        for size in ["1K", "1.5K", "2K"] {
            let request: GenerateImageRequest =
                serde_json::from_value(serde_json::json!({"prompt":"小猫", "size":size})).unwrap();
            assert_eq!(
                serde_json::to_value(ImageGenerationPayload::new(request).unwrap()).unwrap()
                    ["size"],
                size
            );
        }
        assert!(serde_json::from_value::<GenerateImageRequest>(
            serde_json::json!({"prompt":"小猫", "size":"auto"})
        )
        .is_err());
    }

    #[test]
    fn sends_expected_request_and_maps_provider_response() {
        let (result, request) = exchange(
            "200 OK",
            r#"{
            "data": [
                {"url":"https://example.com/layer.png","z_index":1,"name":"主体","description":"前景",
                 "bounding_box":{"absolute":[0,0,10,10],"normalized":[0,0,1000,1000]}},
                {"url":"https://example.com/base.png","z_index":0}
            ],
            "usage":{"generated_images":2,"output_tokens":8,"total_tokens":12}
        }"#,
        );
        let (headers, body) = request.split_once("\r\n\r\n").unwrap();
        assert!(headers.starts_with("POST /images/generations HTTP/1.1"));
        assert!(headers
            .to_ascii_lowercase()
            .contains("authorization: bearer test-key"));
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(body).unwrap(),
            serde_json::json!({
                "model": ARK_MODEL,
                "image": "data:image/png;base64,dGVzdA==",
                "size": "1.5K",
                "layer_decomposition": true,
                "watermark": false,
                "response_format": "url",
                "output_format": "png"
            })
        );
        let generated = result.unwrap();
        assert_eq!(generated.model, ARK_MODEL);
        assert_eq!(
            generated.upstream_request_id.as_deref(),
            Some("test-upstream-id")
        );
        assert_eq!(
            generated
                .assets
                .iter()
                .map(|asset| asset.z_index)
                .collect::<Vec<_>>(),
            [0, 1]
        );
        assert_eq!(generated.assets[1].name.as_deref(), Some("主体"));
        assert_eq!(generated.assets[1].description.as_deref(), Some("前景"));
        assert_eq!(
            generated.assets[1].url.as_deref(),
            Some("https://example.com/layer.png")
        );
        assert_eq!(
            generated.assets[1].bounding_box.as_ref().unwrap().absolute,
            [0.0, 0.0, 10.0, 10.0]
        );
        let usage = generated.usage.unwrap();
        assert_eq!(
            (
                usage.generated_images,
                usage.output_tokens,
                usage.total_tokens
            ),
            (Some(2), Some(8), Some(12))
        );
    }

    #[test]
    fn maps_http_failures_and_rejects_invalid_responses() {
        for (status, body, code, message) in [
            (
                "401 Unauthorized",
                r#"{"error":{"message":"Invalid key"}}"#,
                "authentication",
                "Invalid key",
            ),
            (
                "429 Too Many Requests",
                "{}",
                "rate_limited",
                "请求过于频繁，请稍后重试",
            ),
            (
                "200 OK",
                "not json",
                "invalid_response",
                "模型返回了无法解析的数据",
            ),
            (
                "200 OK",
                r#"{"data":[]}"#,
                "invalid_response",
                "模型返回的图层数量不合法",
            ),
        ] {
            let error = exchange(status, body).0.err().expect("request should fail");
            assert_eq!(error.code, code);
            assert_eq!(error.message, message);
        }
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
}
