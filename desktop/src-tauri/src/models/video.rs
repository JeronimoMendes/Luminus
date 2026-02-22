use chrono::{DateTime, Utc};
use serde::Serialize;

#[derive(Serialize)]
pub struct VideoMeta {
    pub path: String,
    pub filename: String,
    pub duration_secs: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fps: Option<f64>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub bitrate: Option<u32>,
    pub datetime: Option<DateTime<Utc>>,
    pub thumbnail_path: Option<String>,
}
