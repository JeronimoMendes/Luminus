use super::image::ImageInfo;

#[derive(serde::Serialize)]
pub struct ScanResult {
    pub images: Vec<ImageInfo>,
}
