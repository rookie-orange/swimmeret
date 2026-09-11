use crate::{
    decomposition::types::{
        DecomposeRequest, DecompositionManifest, DecompositionProgress, StagedSource,
    },
    diagnostics::{log_identifier, log_json_value},
    error::CommandError,
    services::decomposition::DecompositionService,
};
use tauri::{
    ipc::{Channel, InvokeBody, Request, Response},
    State,
};
use tracing::{info, warn};

#[tauri::command]
pub fn log_image_diagnostic(event: String, details: serde_json::Value) {
    info!(
        event = %log_identifier(&event),
        details = %log_json_value(&details),
        "frontend image diagnostic",
    );
}

#[tauri::command]
pub fn stage_layer_source(
    request: Request<'_>,
    state: State<'_, DecompositionService>,
) -> Result<StagedSource, CommandError> {
    let InvokeBody::Raw(bytes) = request.body() else {
        warn!("stage_layer_source received a non-raw IPC body");
        return Err(CommandError::new(
            "invalid_input",
            "图层分离需要 PNG 或 JPEG 二进制输入",
        ));
    };
    state.stage_source(bytes)
}

#[tauri::command]
pub fn discard_layer_source(
    source_id: String,
    state: State<'_, DecompositionService>,
) -> Result<(), CommandError> {
    state.discard_source(&source_id)
}

#[tauri::command]
pub async fn decompose_image(
    request: DecomposeRequest,
    on_progress: Channel<DecompositionProgress>,
    state: State<'_, DecompositionService>,
) -> Result<DecompositionManifest, CommandError> {
    state
        .decompose(request, move |progress| {
            let _ = on_progress.send(progress);
        })
        .await
}

#[tauri::command]
pub async fn read_decomposition_asset(
    job_id: String,
    asset_id: String,
    state: State<'_, DecompositionService>,
) -> Result<Response, CommandError> {
    state
        .read_asset(&job_id, &asset_id)
        .await
        .map(Response::new)
}

#[tauri::command]
pub async fn cleanup_decomposition_job(
    job_id: String,
    state: State<'_, DecompositionService>,
) -> Result<(), CommandError> {
    state.cleanup_job(&job_id).await
}
