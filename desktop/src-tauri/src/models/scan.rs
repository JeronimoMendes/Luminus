use super::image::PhotographMeta;
use serde::Serialize;

#[derive(Serialize)]
pub struct ScanResult {
    pub images: Vec<PhotographMeta>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanStarted {
    pub total_images: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanUpdate {
    pub current_image_path: String,
    pub images_scanned: Vec<PhotographMeta>,
    pub images_to_scan: Vec<PhotographMeta>,
}
