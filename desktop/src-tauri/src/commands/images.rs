use crate::error::MyCustomError;
use crate::models::PhotographMeta;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_all_images(
    state: State<'_, AppState>,
) -> Result<Vec<PhotographMeta>, MyCustomError> {
    let images: Vec<PhotographMeta> = sqlx::query_as(
        "SELECT
            p.file_path as path,
            p.filename,
            datetime(p.datetime, 'unixepoch') as datetime,
            p.width,
            p.height,
            COALESCE(c.maker, 'Unknown') as camera_maker,
            COALESCE(c.model, 'Unknown') as camera_model,
            COALESCE(l.maker, 'Unknown') as lens_maker,
            COALESCE(l.model, 'Unknown') as lens_model,
            CAST(p.aperture AS TEXT) as aperture,
            CAST(p.iso AS TEXT) as iso,
            p.exposure_time as exposure
        FROM photograph p
        LEFT JOIN camera c ON p.camera_id = c.id
        LEFT JOIN lens l ON p.lens_id = l.id
        ORDER BY p.datetime DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(MyCustomError::from)?;

    Ok(images)
}
