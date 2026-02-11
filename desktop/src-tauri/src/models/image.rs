use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PhotographMeta {
    pub path: String,
    pub filename: String,
    pub datetime: DateTime<Utc>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub camera_maker: String,
    pub camera_model: String,
    pub lens_maker: String,
    pub lens_model: String,
    pub aperture: String,
    pub iso: String,
    pub exposure: String,
}
