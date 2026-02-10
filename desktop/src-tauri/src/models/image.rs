#[derive(serde::Serialize)]
pub struct ImageInfo {
    pub path: String,
    pub filename: String,
    pub size_bytes: u64,
    pub dimensions: Option<(u32, u32)>,
    pub camera_model: String,
    pub lens_model: String,
    pub aperture: String,
    pub iso: String,
    pub exposure: String,
}
