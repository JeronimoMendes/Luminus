use crate::error::MyCustomError;
use crate::models::{ScanResult, ScanStarted};
use crate::scanner::{metadata, thumbnail, walker};
use crate::state::AppState;
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub async fn scan_folder(
    dir_path: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<ScanResult, MyCustomError> {
    log::info!("Scanning folder {}", dir_path);
    let path = Path::new(&dir_path);

    let results = walker::scan(path).map_err(MyCustomError::from)?;
    let _ = app.emit(
        "scan-started",
        ScanStarted {
            total_images: results.images.len(),
        },
    );

    metadata::save_photographs(&results, &state.db)
        .await
        .map_err(MyCustomError::from)?;

    metadata::save_videos(&results, &state.db)
        .await
        .map_err(MyCustomError::from)?;

    if let Ok(data_dir) = app.path().app_data_dir() {
        let thumbnails_dir = data_dir.join("thumbnails");
        let ffmpeg_command =
            thumbnail::resolve_ffmpeg_command(app.path().resource_dir().ok().as_deref());

        log::info!("Using ffmpeg command '{}'", ffmpeg_command.display());
        for video in &results.videos {
            let video_path = Path::new(&video.path);
            if let Err(e) = thumbnail::generate_thumbnail(
                video_path,
                &thumbnails_dir,
                ffmpeg_command.as_os_str(),
            ) {
                log::warn!("Could not generate thumbnail for {}: {}", video.path, e);
            }
        }
    }

    metadata::embed_media(&results, &state.db, &state.clip, app)
        .await
        .map_err(MyCustomError::from)?;

    Ok(results)
}
