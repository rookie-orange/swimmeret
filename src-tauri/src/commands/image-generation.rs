use crate::{
    error::CommandError, image_generation::GenerateImageRequest,
    services::image_generation::ImageGenerationService,
};
use tauri::{ipc::Response, State};

#[tauri::command]
pub async fn generate_image(
    request: GenerateImageRequest,
    state: State<'_, ImageGenerationService>,
) -> Result<Response, CommandError> {
    state.generate(request).await.map(Response::new)
}
