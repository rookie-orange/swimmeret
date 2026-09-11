use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub enum ImageGenerationSize {
    #[serde(rename = "1K")]
    OneK,
    #[serde(rename = "1.5K")]
    OneAndHalfK,
    #[serde(rename = "2K")]
    TwoK,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImageRequest {
    pub(crate) prompt: String,
    pub(crate) size: ImageGenerationSize,
}
