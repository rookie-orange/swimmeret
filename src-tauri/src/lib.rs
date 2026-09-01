mod decomposition;

use decomposition::DecompositionState;
use tauri::Manager;

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

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let cache_root = app.path().app_cache_dir()?.join("layer-decomposition");
            app.manage(DecompositionState::new(cache_root)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            decomposition::stage_layer_source,
            decomposition::discard_layer_source,
            decomposition::decompose_image,
            decomposition::read_decomposition_asset,
            decomposition::cleanup_decomposition_job,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
