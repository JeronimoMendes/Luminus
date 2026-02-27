use crate::error::MyCustomError;
use crate::models::PhotographMeta;
use crate::models::VideoMeta;
use crate::scanner::thumbnail::thumbnail_path_for;
use crate::state::AppState;
use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;
use std::collections::HashMap;
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

#[derive(sqlx::FromRow)]
struct VideoRowWithId {
    id: i64,
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

#[derive(sqlx::FromRow)]
struct PhotographMetaWithId {
    id: i64,
    path: String,
    filename: String,
    datetime: chrono::DateTime<chrono::Utc>,
    width: Option<u32>,
    height: Option<u32>,
    camera_maker: String,
    camera_model: String,
    lens_maker: String,
    lens_model: String,
    aperture: String,
    iso: String,
    exposure: String,
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
        .text_model
        .lock()
        .unwrap()
        .embed_text(&query)
        .map_err(MyCustomError::Anyhow)?;
    let query_embed_vec = query_embed.to_vec();
    let embed_bytes = query_embed_vec.as_bytes();

    let photo_ids: Vec<(i64,)> = sqlx::query_as(
        "SELECT photograph_id FROM photo_vectors WHERE embedding MATCH ? AND k = ? and distance < ? ORDER BY distance",
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

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum MediaSearchItem {
    #[serde(rename = "image")]
    Image(PhotographMeta),
    #[serde(rename = "video")]
    Video {
        #[serde(flatten)]
        meta: VideoMeta,
        matching_frames: Vec<f32>,
    },
}

#[tauri::command]
pub async fn query_media(
    query: String,
    k: i64,
    distance: f64,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Vec<MediaSearchItem>, MyCustomError> {
    let k = k.clamp(1, 200);
    let distance = distance.clamp(0.01, 10.0);
    log::info!(
        "Querying media with '{}' (k={}, distance={})",
        query,
        k,
        distance
    );
    let query_embed = state
        .text_model
        .lock()
        .unwrap()
        .embed_text(&query)
        .map_err(MyCustomError::Anyhow)?;
    let query_embed_vec = query_embed.to_vec();
    let embed_bytes = query_embed_vec.as_bytes();

    let photo_results: Vec<(i64, f64)> = sqlx::query_as(
        "SELECT photograph_id, distance FROM photo_vectors WHERE embedding MATCH ? AND k = ? AND distance < ? ORDER BY distance",
    )
    .bind(embed_bytes)
    .bind(k)
    .bind(distance)
    .fetch_all(&state.db)
    .await
    .map_err(MyCustomError::from)?;

    log::info!(
        "Found {} images with similarity to query",
        photo_results.len()
    );

    // Query video_vectors with higher k to capture many frames
    let video_k = (k * 20).min(2000);
    let video_results: Vec<(i64, i64, f64)> = sqlx::query_as(
        "SELECT video_id, frame_timestamp, distance FROM video_vectors WHERE embedding MATCH ? AND k = ? AND distance < ? ORDER BY distance",
    )
    .bind(embed_bytes)
    .bind(video_k)
    .bind(distance)
    .fetch_all(&state.db)
    .await
    .map_err(MyCustomError::from)?;

    log::info!(
        "Found {} video frames with similarity to query",
        video_results.len()
    );

    // We get the lowest distance frames from each video (to later compare with photographs)
    let mut video_map: HashMap<i64, (f64, Vec<f32>)> = HashMap::new();
    for (video_id, frame_ts, dist) in video_results {
        let entry = video_map.entry(video_id).or_insert((dist, vec![]));
        if dist < entry.0 {
            entry.0 = dist;
        }
        entry.1.push(frame_ts as f32);
    }

    let mut combined: Vec<(f64, Either)> = vec![];
    for (photo_id, dist) in &photo_results {
        combined.push((*dist, Either::Photo(*photo_id)));
    }
    for (video_id, (dist, frames)) in &video_map {
        combined.push((*dist, Either::Video(*video_id, frames.clone())));
    }
    // We only want the k best photos and videos
    combined.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    combined.truncate(k as usize);

    let photo_ids: Vec<i64> = combined
        .iter()
        .filter_map(|(_, e)| {
            if let Either::Photo(id) = e {
                Some(*id)
            } else {
                None
            }
        })
        .collect();
    let video_ids: Vec<i64> = combined
        .iter()
        .filter_map(|(_, e)| {
            if let Either::Video(id, _) = e {
                Some(*id)
            } else {
                None
            }
        })
        .collect();

    let photo_by_id: HashMap<i64, PhotographMeta> = if photo_ids.is_empty() {
        HashMap::new()
    } else {
        let placeholders = photo_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        let sql = format!(
            "SELECT
                p.id as id,
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
        let mut q = sqlx::query_as::<_, PhotographMetaWithId>(&sql);
        for id in &photo_ids {
            q = q.bind(id);
        }
        let rows: Vec<PhotographMetaWithId> =
            q.fetch_all(&state.db).await.map_err(MyCustomError::from)?;
        rows.into_iter()
            .map(|r| {
                (
                    r.id,
                    PhotographMeta {
                        path: r.path,
                        filename: r.filename,
                        datetime: r.datetime,
                        width: r.width,
                        height: r.height,
                        camera_maker: r.camera_maker,
                        camera_model: r.camera_model,
                        lens_maker: r.lens_maker,
                        lens_model: r.lens_model,
                        aperture: r.aperture,
                        iso: r.iso,
                        exposure: r.exposure,
                    },
                )
            })
            .collect()
    };

    let thumbnails_dir = app.path().app_data_dir().ok().map(|d| d.join("thumbnails"));
    let video_by_id: HashMap<i64, VideoMeta> = if video_ids.is_empty() {
        HashMap::new()
    } else {
        let placeholders = video_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        let sql = format!(
            "SELECT
                id,
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
            WHERE id IN ({placeholders})"
        );

        let mut q = sqlx::query_as::<_, VideoRowWithId>(&sql);
        for id in &video_ids {
            q = q.bind(id);
        }
        let rows: Vec<VideoRowWithId> =
            q.fetch_all(&state.db).await.map_err(MyCustomError::from)?;

        rows.into_iter()
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
                let meta = VideoMeta {
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
                };
                (row.id, meta)
            })
            .collect()
    };

    let mut results = vec![];
    for (_, either) in combined {
        match either {
            Either::Photo(id) => {
                if let Some(meta) = photo_by_id.get(&id) {
                    results.push(MediaSearchItem::Image(meta.clone()));
                }
            }
            Either::Video(id, frames) => {
                if let Some(meta) = video_by_id.get(&id) {
                    results.push(MediaSearchItem::Video {
                        meta: VideoMeta {
                            path: meta.path.clone(),
                            filename: meta.filename.clone(),
                            duration_secs: meta.duration_secs,
                            width: meta.width,
                            height: meta.height,
                            fps: meta.fps,
                            video_codec: meta.video_codec.clone(),
                            audio_codec: meta.audio_codec.clone(),
                            bitrate: meta.bitrate,
                            datetime: meta.datetime,
                            thumbnail_path: meta.thumbnail_path.clone(),
                        },
                        matching_frames: frames,
                    });
                }
            }
        }
    }

    log::info!("query_media '{}' returned {} results", query, results.len());
    Ok(results)
}

enum Either {
    Photo(i64),
    Video(i64, Vec<f32>),
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
