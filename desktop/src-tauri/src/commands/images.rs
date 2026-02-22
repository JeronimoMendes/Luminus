use crate::error::MyCustomError;
use crate::models::PhotographMeta;
use crate::models::VideoMeta;
use crate::scanner::thumbnail::thumbnail_path_for;
use crate::state::AppState;
use chrono::{DateTime, TimeZone, Utc};
use std::path::Path;
use tauri::{Manager, State};
use zerocopy::IntoBytes;

#[derive(sqlx::FromRow)]
struct VideoRow {
    path: String,
    filename: String,
    duration_secs: Option<f64>,
    width: Option<i64>,
    height: Option<i64>,
    fps: Option<f64>,
    video_codec: Option<String>,
    audio_codec: Option<String>,
    bitrate: Option<i64>,
    ts: Option<i64>,
}

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
    k: i64,
    distance: f64,
    state: State<'_, AppState>,
) -> Result<Vec<PhotographMeta>, MyCustomError> {
    let k = k.clamp(1, 200);
    let distance = distance.clamp(0.01, 10.0);
    log::info!(
        "Querying photographs with '{}' (k={}, distance={})",
        query,
        k,
        distance
    );
    let query_embed = state
        .clip
        .lock()
        .unwrap()
        .embed_text(&query)
        .map_err(MyCustomError::Anyhow)?;
    let query_embed_vec = query_embed.to_vec();
    let embed_bytes = query_embed_vec.as_bytes();

    let photo_ids: Vec<(i64,)> = sqlx::query_as(
        "SELECT photograph_id FROM vectors WHERE embedding MATCH ? AND k = ? and distance < ? ORDER BY distance",
    )
    .bind(embed_bytes)
    .bind(k)
    .bind(distance)
    .fetch_all(&state.db)
    .await
    .map_err(MyCustomError::from)?;

    if photo_ids.is_empty() {
        return Ok(vec![]);
    }

    let ids: Vec<i64> = photo_ids.into_iter().map(|(id,)| id).collect();
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let ranking_order = ids
        .iter()
        .enumerate()
        .map(|(index, id)| format!("WHEN {} THEN {}", id, index))
        .collect::<Vec<_>>()
        .join(" ");
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
        WHERE p.id IN ({placeholders})
        ORDER BY CASE p.id {ranking_order} ELSE {} END",
        ids.len()
    );

    let mut q = sqlx::query_as::<_, PhotographMeta>(&sql);
    for id in &ids {
        q = q.bind(id);
    }
    let images = q.fetch_all(&state.db).await.map_err(MyCustomError::from)?;

    log::info!("Query '{}' returned {}", query, images.len());
    Ok(images)
}

#[tauri::command]
pub async fn get_all_videos(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Vec<VideoMeta>, MyCustomError> {
    let rows: Vec<VideoRow> = sqlx::query_as(
        "SELECT
            file_path as path,
            filename,
            duration_secs,
            width,
            height,
            fps,
            video_codec,
            audio_codec,
            bitrate,
            datetime as ts
        FROM video
        ORDER BY datetime DESC NULLS LAST",
    )
    .fetch_all(&state.db)
    .await
    .map_err(MyCustomError::from)?;

    let thumbnails_dir = app.path().app_data_dir().ok().map(|d| d.join("thumbnails"));

    let videos = rows
        .into_iter()
        .map(|row| {
            let thumbnail_path = thumbnails_dir.as_deref().and_then(|dir| {
                let p = thumbnail_path_for(Path::new(&row.path), dir);
                if p.exists() {
                    Some(p.to_string_lossy().into_owned())
                } else {
                    None
                }
            });

            let datetime: Option<DateTime<Utc>> =
                row.ts.and_then(|ts| Utc.timestamp_opt(ts, 0).single());

            VideoMeta {
                path: row.path,
                filename: row.filename,
                duration_secs: row.duration_secs,
                width: row.width.map(|v| v as u32),
                height: row.height.map(|v| v as u32),
                fps: row.fps,
                video_codec: row.video_codec,
                audio_codec: row.audio_codec,
                bitrate: row.bitrate.map(|v| v as u32),
                datetime,
                thumbnail_path,
            }
        })
        .collect();

    Ok(videos)
}
