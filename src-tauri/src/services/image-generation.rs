use crate::{
    clients::{ark::ArkClient, download::DownloadClient, http},
    decomposition::validation::validate_png,
    error::CommandError,
    image_generation::GenerateImageRequest,
};
use tokio::sync::Semaphore;
use tracing::info;
use uuid::Uuid;

const MAX_GENERATED_IMAGE_BYTES: usize = 30 * 1024 * 1024;

pub(crate) struct ImageGenerationService {
    ark: ArkClient,
    downloads: DownloadClient,
    task_gate: Semaphore,
}

impl ImageGenerationService {
    pub(crate) fn new() -> Result<Self, reqwest::Error> {
        let http = http::new_client()?;
        Ok(Self {
            ark: ArkClient::new(http.clone()),
            downloads: DownloadClient::new(http),
            task_gate: Semaphore::new(1),
        })
    }

    pub(crate) async fn generate(
        &self,
        request: GenerateImageRequest,
    ) -> Result<Vec<u8>, CommandError> {
        let request_id = Uuid::new_v4().to_string();
        let _permit = self
            .task_gate
            .acquire()
            .await
            .map_err(|_| CommandError::internal("图像生成服务已关闭"))?;
        let prepared = self.ark.prepare_image_generation(request, &request_id)?;
        let generated = self.ark.generate_image(prepared, &request_id).await?;
        let bytes = self
            .downloads
            .open(&generated.url, MAX_GENERATED_IMAGE_BYTES, &request_id, 0)
            .await?
            .collect(MAX_GENERATED_IMAGE_BYTES)
            .await?;
        validate_png(&bytes, MAX_GENERATED_IMAGE_BYTES, false)?;
        info!(
            request_id = %request_id,
            ark_request_id = ?generated.request_id,
            model = %generated.model,
            bytes = bytes.len(),
            "text to image generation completed",
        );
        Ok(bytes)
    }
}
