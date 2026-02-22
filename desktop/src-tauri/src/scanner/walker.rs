use std::{fs, path::Path};

use crate::{
    models::ScanResult,
    scanner::{metadata::extract_metadata, video_metadata::extract_video_metadata},
};

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "tif", "tiff", "heif", "heic", "avif", "png", "webp", "dng",
];

const SUPPORTED_VIDEO_EXTENSIONS: &[&str] = &["mp4", "mov", "m4v"];

pub fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

pub fn is_supported_video(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_VIDEO_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

pub fn scan(dir: &Path) -> anyhow::Result<ScanResult> {
    let mut images = Vec::new();
    let mut videos = Vec::new();
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                let subdir_results = scan(&path)?;
                images.extend(subdir_results.images);
                videos.extend(subdir_results.videos);
            } else if is_supported_image(&path) {
                let image_meta = extract_metadata(&path)?;
                images.push(image_meta);
            } else if is_supported_video(&path) {
                match extract_video_metadata(&path) {
                    Ok(video_meta) => videos.push(video_meta),
                    Err(e) => log::warn!(
                        "Failed to extract video metadata for {}: {}",
                        path.display(),
                        e
                    ),
                }
            }
        }
    }
    Ok(ScanResult { images, videos })
}
