use crate::error::CommandError;
use reqwest::{redirect, Client};
use std::time::Duration;

/// Clones share the connection pool. Authentication is added per API request,
/// never as a default header on the client used for asset downloads.
pub(crate) fn new_client() -> Result<Client, reqwest::Error> {
    Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .redirect(redirect::Policy::none())
        .timeout(Duration::from_secs(240))
        .build()
}

pub(crate) fn network_error_kind(error: &reqwest::Error) -> &'static str {
    if error.is_timeout() {
        "timeout"
    } else if error.is_connect() {
        "connect"
    } else if error.is_body() {
        "body"
    } else if error.is_decode() {
        "decode"
    } else {
        "request"
    }
}

pub(crate) fn map_network_error(error: reqwest::Error) -> CommandError {
    match network_error_kind(&error) {
        "timeout" => CommandError::new("timeout", "图片请求超时，请稍后重试"),
        "connect" => CommandError::new("network", "无法连接火山引擎服务，请检查网络后重试"),
        "body" => CommandError::new("network", "读取火山引擎响应失败，请稍后重试"),
        "decode" => CommandError::new("network", "解析火山引擎响应失败，请稍后重试"),
        _ => CommandError::new("network", "网络请求失败，请稍后重试"),
    }
}
