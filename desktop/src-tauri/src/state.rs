use crate::db;
use open_clip_inference::{TextEmbedder, VisionEmbedder};

pub struct AppState {
    pub db: db::Db,
    pub image_embeder: VisionEmbedder,
    pub text_embeder: TextEmbedder,
}
