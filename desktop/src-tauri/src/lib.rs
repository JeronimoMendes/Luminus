mod clip;
mod commands;
mod db;
mod error;
mod models;
mod scanner;
mod state;

use crate::db::setup_db;
use crate::state::AppState;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        let backtrace = std::backtrace::Backtrace::force_capture();
        eprintln!("\n=== PANIC ===\n{info}\n\nBacktrace:\n{backtrace}");
    }));

    std::env::set_var("RUST_BACKTRACE", "1");

    video_rs::init().unwrap();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let settings_item = MenuItemBuilder::with_id("settings", "Settings…")
                .accelerator("CmdOrCtrl+,")
                .build(app)?;
            let app_submenu = SubmenuBuilder::new(app, "App")
                .items(&[&settings_item])
                .separator()
                .quit()
                .build()?;
            let edit_submenu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            let view_submenu = SubmenuBuilder::new(app, "View").fullscreen().build()?;
            let window_submenu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .close_window()
                .build()?;
            let menu = MenuBuilder::new(app)
                .item(&app_submenu)
                .item(&edit_submenu)
                .item(&view_submenu)
                .item(&window_submenu)
                .build()?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app, event| {
                if event.id() == "settings" {
                    if let Some(w) = app.webview_windows().get("settings") {
                        let _ = w.set_focus();
                    } else {
                        let _ = WebviewWindowBuilder::new(
                            app,
                            "settings",
                            WebviewUrl::App("/settings.html".into()),
                        )
                        .title("Settings")
                        .inner_size(400.0, 350.0)
                        .resizable(false)
                        .minimizable(false)
                        .maximizable(false)
                        .build();
                    }
                }
            });
            tauri::async_runtime::block_on(async move {
                let db = setup_db(app).await;
                let (model_path, tokenizer_path) = {
                    let resource_dir = app
                        .path()
                        .resource_dir()
                        .expect("failed to resolve resource_dir");
                    let candidate = resource_dir.join("models/model.onnx");
                    if candidate.exists() {
                        (candidate, resource_dir.join("models/tokenizer.json"))
                    } else {
                        let dev = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                            .join("../../.models/laion-CLIP-ViT-B-32-laion2B-s34B-b79K");
                        (dev.join("model.onnx"), dev.join("tokenizer.json"))
                    }
                };
                let clip = clip::model::ClipModel::new(&model_path, &tokenizer_path)?;

                app.manage(AppState {
                    db,
                    clip: std::sync::Mutex::new(clip),
                });
                Ok::<(), Box<dyn std::error::Error>>(())
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scanner::scan_folder,
            commands::images::get_all_images,
            commands::images::get_all_videos,
            commands::images::query_photograph,
            commands::images::query_media,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
