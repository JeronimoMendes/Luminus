use super::image::PhotographMeta;
use super::video::VideoMeta;
use serde::Serialize;

#[derive(Serialize)]
pub struct ScanResult {
    pub images: Vec<PhotographMeta>,
    pub videos: Vec<VideoMeta>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanStarted {
    pub total_images: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanUpdate {
    pub current_batch: usize,
    pub total_batches: usize,
    pub images_scanned: usize,
    pub images_to_scan: usize,
}
