use std::sync::Mutex;

use crate::clip;
use crate::db;

pub struct AppState {
    pub db: db::Db,
    pub clip: Mutex<clip::model::ClipModel>,
}
