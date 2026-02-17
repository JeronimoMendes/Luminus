use crate::error::MyCustomError;
use crate::models::{ScanResult, ScanStarted};
use crate::scanner::{metadata, walker};
use crate::state::AppState;
use std::path::Path;
use tauri::{AppHandle, Emitter, State};

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

    metadata::embed_photographs(&results, &state.db, &state.clip, app)
        .await
        .map_err(MyCustomError::from)?;

    Ok(results)
}
