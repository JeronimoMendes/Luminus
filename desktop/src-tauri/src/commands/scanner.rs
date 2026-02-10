use crate::error::MyCustomError;
use crate::models::ScanResult;
use std::path::Path;

use crate::scanner::walker;

#[tauri::command]
pub async fn scan_folder(dir_path: String) -> Result<ScanResult, MyCustomError> {
    log::info!("Scanning folder {}", dir_path);
    let path = Path::new(&dir_path);

    let results = walker::scan(path).map_err(MyCustomError::from)?;

    Ok(results)
}
