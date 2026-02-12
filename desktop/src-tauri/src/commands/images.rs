use crate::error::MyCustomError;
use crate::models::PhotographMeta;
use crate::state::AppState;
use tauri::State;
use zerocopy::IntoBytes;

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

#[tauri::command]
pub async fn query_photograph(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<PhotographMeta>, MyCustomError> {
    log::info!("Querying photographs with '{}'", query);
    let query_embed = state
        .text_embeder
        .embed_text(&query)
        .map_err(|e| MyCustomError::Anyhow(e.into()))?;
    let embed_bytes = query_embed.as_slice().unwrap().as_bytes();

    let photo_ids: Vec<(i64,)> = sqlx::query_as(
        "SELECT photograph_id FROM vectors WHERE embedding MATCH ? AND k = 10 and distance < 1.4 ORDER BY distance",
    )
    .bind(embed_bytes)
    .fetch_all(&state.db)
    .await
    .map_err(MyCustomError::from)?;

    if photo_ids.is_empty() {
        return Ok(vec![]);
    }

    let ids: Vec<i64> = photo_ids.into_iter().map(|(id,)| id).collect();
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let sql = format!(
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
        WHERE p.id IN ({placeholders})"
    );

    let mut q = sqlx::query_as::<_, PhotographMeta>(&sql);
    for id in &ids {
        q = q.bind(id);
    }
    let images = q.fetch_all(&state.db).await.map_err(MyCustomError::from)?;

    log::info!("Query '{}' returned {}", query, images.len());
    Ok(images)
}
