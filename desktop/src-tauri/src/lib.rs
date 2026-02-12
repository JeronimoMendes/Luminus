mod commands;
mod db;
mod error;
mod models;
mod scanner;
mod state;

use crate::db::setup_db;
use crate::state::AppState;
use open_clip_inference::Clip;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        let backtrace = std::backtrace::Backtrace::force_capture();
        eprintln!("\n=== PANIC ===\n{info}\n\nBacktrace:\n{backtrace}");
    }));

    std::env::set_var("RUST_BACKTRACE", "1");

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            tauri::async_runtime::block_on(async move {
                let db = setup_db(app).await;
                let model_id = "RuteNL/MobileCLIP2-S2-OpenCLIP-ONNX";
                let clip = Clip::from_hf(model_id)
                    // .with_execution_providers(&[CoreML::default().build()])
                    .build()
                    .await?;
                let image_embeder = clip.vision;
                let text_embeder = clip.text;

                app.manage(AppState {
                    db,
                    image_embeder,
                    text_embeder,
                });
                Ok::<(), Box<dyn std::error::Error>>(())
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scanner::scan_folder,
            commands::images::get_all_images,
            commands::images::query_photograph,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
