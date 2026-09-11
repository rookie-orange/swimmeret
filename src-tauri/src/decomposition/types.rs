use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StagedSource {
    pub(crate) source_id: String,
    pub(crate) width: u32,
    pub(crate) height: u32,
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
    pub(crate) source_id: String,
    pub(crate) prompt: Option<String>,
    pub(crate) size: OutputSize,
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
    pub(crate) job_id: String,
    pub(crate) model: String,
    pub(crate) assets: Vec<ManifestAsset>,
    pub(crate) usage: Option<ManifestUsage>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestAsset {
    pub(crate) asset_id: String,
    pub(crate) z_index: i32,
    pub(crate) width: u32,
    pub(crate) height: u32,
    pub(crate) mime_type: String,
    pub(crate) bounding_box: Option<BoundingBox>,
    pub(crate) name: Option<String>,
    pub(crate) description: Option<String>,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct BoundingBox {
    pub(crate) absolute: [f64; 4],
    pub(crate) normalized: [f64; 4],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestUsage {
    pub(crate) generated_images: Option<u64>,
    pub(crate) output_tokens: Option<u64>,
    pub(crate) total_tokens: Option<u64>,
}

pub(crate) struct StagedInput {
    pub(crate) bytes: Vec<u8>,
    pub(crate) height: u32,
    pub(crate) mime_type: &'static str,
    pub(crate) width: u32,
}

/// Provider-independent result before generated images have been cached.
pub(crate) struct GeneratedLayers {
    pub(crate) model: String,
    pub(crate) assets: Vec<GeneratedLayer>,
    pub(crate) usage: Option<ManifestUsage>,
    pub(crate) upstream_request_id: Option<String>,
}

pub(crate) struct GeneratedLayer {
    pub(crate) url: Option<String>,
    pub(crate) z_index: i32,
    pub(crate) bounding_box: Option<BoundingBox>,
    pub(crate) name: Option<String>,
    pub(crate) description: Option<String>,
}
