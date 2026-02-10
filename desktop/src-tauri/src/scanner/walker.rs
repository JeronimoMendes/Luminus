use std::{fs, path::Path};

use crate::{models::ScanResult, scanner::metadata::extract_metadata};

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "tif", "tiff", "heif", "heic", "avif", "png", "webp", "dng",
];

pub fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

pub fn scan(dir: &Path) -> anyhow::Result<ScanResult> {
    let mut images = Vec::new();
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            // if it's a directory we recursively check it
            if path.is_dir() {
                let subdir_results = scan(&path)?;
                images.extend(subdir_results.images)
            } else {
                // it's a file so we must check if it's an image
                if is_supported_image(&path) {
                    let image_meta = extract_metadata(&path)?;
                    images.push(image_meta);
                }
            }
        }
    }
    Ok(ScanResult { images })
}
