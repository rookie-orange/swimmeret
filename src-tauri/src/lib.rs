mod decomposition;
mod projects;

use decomposition::DecompositionState;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tracing_subscriber::{fmt, EnvFilter};

#[derive(Default)]
struct CanvasExitGuard {
    owner: Mutex<Option<String>>,
    approved: AtomicBool,
}

#[tauri::command]
fn set_canvas_exit_guard(
    state: tauri::State<'_, CanvasExitGuard>,
    owner: String,
    enabled: bool,
) -> Result<(), String> {
    let mut current = state.owner.lock().map_err(|_| "退出保护不可用")?;
    if enabled {
        *current = Some(owner);
    } else if current.as_ref() == Some(&owner) {
        *current = None;
    }
    Ok(())
}

#[tauri::command]
fn complete_canvas_exit(app: tauri::AppHandle, state: tauri::State<'_, CanvasExitGuard>) {
    state.approved.store(true, Ordering::SeqCst);
    app.exit(0);
}

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
        .manage(CanvasExitGuard::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let cache_root = app.path().app_cache_dir()?.join("layer-decomposition");
            tracing::debug!(cache_root = %cache_root.display(), "initializing layer decomposition state");
            app.manage(DecompositionState::new(cache_root)?);
            app.manage(projects::ProjectState::new(app.path().app_data_dir()?.join("projects"))?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            decomposition::log_image_diagnostic,
            decomposition::stage_layer_source,
            decomposition::discard_layer_source,
            decomposition::decompose_image,
            decomposition::read_decomposition_asset,
            decomposition::cleanup_decomposition_job,
            projects::list_canvas_projects,
            projects::create_canvas_project,
            projects::load_canvas_project,
            projects::save_canvas_project,
            projects::trash_canvas_project,
            projects::delete_canvas_project,
            projects::write_canvas_asset,
            projects::read_canvas_asset,
            projects::discard_canvas_asset,
            set_canvas_exit_guard,
            complete_canvas_exit,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                let guard = app.state::<CanvasExitGuard>();
                if guard.owner.lock().map(|owner| owner.is_some()).unwrap_or(true) && !guard.approved.load(Ordering::SeqCst) && app.get_webview_window("main").is_some() {
                    api.prevent_exit();
                    let _ = app.emit("canvas-exit-requested", ());
                }
            }
        });
}
