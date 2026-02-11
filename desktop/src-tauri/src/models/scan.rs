use super::image::PhotographMeta;

#[derive(serde::Serialize)]
pub struct ScanResult {
    pub images: Vec<PhotographMeta>,
}
