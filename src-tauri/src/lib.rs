mod decomposition;

use decomposition::DecompositionState;
use tauri::Manager;
use tracing_subscriber::{fmt, EnvFilter};

#[cfg(debug_assertions)]
fn load_development_environment() {
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../.env");
    let _ = dotenvy::from_path(env_path);
}

#[cfg(not(debug_assertions))]
fn load_development_environment() {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    load_development_environment();
    let _ = fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("swimmeret_lib=debug")),
        )
        .with_target(true)
        .compact()
        .try_init();
    tracing::info!("Rust diagnostics initialized; override verbosity with RUST_LOG");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let cache_root = app.path().app_cache_dir()?.join("layer-decomposition");
            tracing::debug!(cache_root = %cache_root.display(), "initializing layer decomposition state");
            app.manage(DecompositionState::new(cache_root)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            decomposition::log_image_diagnostic,
            decomposition::stage_layer_source,
            decomposition::discard_layer_source,
            decomposition::decompose_image,
            decomposition::read_decomposition_asset,
            decomposition::cleanup_decomposition_job,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
