use super::http::{map_network_error, network_error_kind};
use crate::error::CommandError;
use reqwest::{Client, Response, Url};
use tracing::{debug, error};

#[derive(Clone)]
pub(crate) struct DownloadClient {
    http: Client,
}

pub(crate) struct Download {
    response: Response,
    request_id: String,
    z_index: i32,
}

impl DownloadClient {
    pub(crate) fn new(http: Client) -> Self {
        Self { http }
    }

    pub(crate) async fn open(
        &self,
        url: &str,
        max_bytes: usize,
        request_id: &str,
        z_index: i32,
    ) -> Result<Download, CommandError> {
        let parsed_url = validate_download_url(url)?;
        let download_host = parsed_url.host_str().unwrap_or("unknown").to_string();
        let response = match self.http.get(parsed_url).send().await {
            Ok(response) => response,
            Err(error) => {
                let network_kind = network_error_kind(&error);
                let mapped = map_network_error(error);
                error!(
                    request_id,
                    z_index,
                    network_kind,
                    code = mapped.code,
                    message = %mapped.message,
                    "image download request failed",
                );
                return Err(mapped);
            }
        };
        let http_status = response.status();
        let content_length = response.content_length();
        debug!(
            request_id,
            z_index,
            host = %download_host,
            http_status = http_status.as_u16(),
            content_length = ?content_length,
            "received image download response",
        );
        if !response.status().is_success() {
            return Err(CommandError::new(
                "download_failed",
                format!("下载生成图片失败（HTTP {}）", response.status().as_u16()),
            ));
        }
        if response
            .content_length()
            .is_some_and(|length| length > max_bytes as u64)
        {
            return Err(CommandError::new(
                "download_too_large",
                "生成图片超过 30 MiB 限制",
            ));
        }

        Ok(Download {
            response,
            request_id: request_id.to_string(),
            z_index,
        })
    }
}

impl Download {
    pub(crate) async fn chunk(&mut self) -> Result<Option<impl AsRef<[u8]>>, CommandError> {
        match self.response.chunk().await {
            Ok(chunk) => Ok(chunk),
            Err(error) => {
                let network_kind = network_error_kind(&error);
                let mapped = map_network_error(error);
                error!(
                    request_id = %self.request_id,
                    z_index = self.z_index,
                    network_kind,
                    code = mapped.code,
                    message = %mapped.message,
                    "image download response read failed",
                );
                Err(mapped)
            }
        }
    }

    pub(crate) async fn collect(mut self, max_bytes: usize) -> Result<Vec<u8>, CommandError> {
        let mut bytes = Vec::new();
        while let Some(chunk) = self.chunk().await? {
            let chunk = chunk.as_ref();
            let next_len = bytes
                .len()
                .checked_add(chunk.len())
                .ok_or_else(|| CommandError::new("download_too_large", "生成图片大小无效"))?;
            if next_len > max_bytes {
                return Err(CommandError::new(
                    "download_too_large",
                    "生成图片超过 30 MiB 限制",
                ));
            }
            bytes.extend_from_slice(chunk);
        }
        Ok(bytes)
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_safe_download_urls() {
        assert!(validate_download_url("https://example.com/layer.png").is_ok());
        assert!(validate_download_url("http://example.com/layer.png").is_err());
        assert!(validate_download_url("https://localhost/layer.png").is_err());
        assert!(validate_download_url("https://127.0.0.1/layer.png").is_err());
        assert!(validate_download_url("https://user@example.com/layer.png").is_err());
        assert!(validate_download_url("https://example.com:8443/layer.png").is_err());
    }
}
