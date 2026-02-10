use exif::{In, Tag};
use std::{fs, path::Path};

use crate::models::ImageInfo;

pub fn extract_metadata(path: &Path) -> anyhow::Result<ImageInfo> {
    log::info!("Reading metadata for file {}", path.display());
    let file = std::fs::File::open(path)?;
    let mut bufreader = std::io::BufReader::new(&file);

    let exifreader = exif::Reader::new();
    let exif = exifreader.read_from_container(&mut bufreader)?;

    let mut camera_model = String::from("Unknown");
    let mut lens_model = String::from("Unknown");
    let mut aperture = String::from("Unknown");
    let mut iso = String::from("Unknown");
    let mut exposure = String::from("Unknown");
    match exif.get_field(Tag::Model, In::PRIMARY) {
        Some(value) => {
            camera_model = value.display_value().to_string();
        }
        None => log::error!("Could not extract camera model!"),
    }
    match exif.get_field(Tag::LensModel, In::PRIMARY) {
        Some(value) => {
            lens_model = value.display_value().to_string();
        }
        None => log::error!("Could not extract lens model!"),
    }
    match exif.get_field(Tag::ApertureValue, In::PRIMARY) {
        Some(value) => {
            aperture = value.display_value().to_string();
        }
        None => log::error!("Could not extract aperture!"),
    }
    match exif.get_field(Tag::ISOSpeed, In::PRIMARY) {
        Some(value) => {
            iso = value.display_value().to_string();
        }
        None => log::error!("Could not extract iso!"),
    }
    match exif.get_field(Tag::ExposureTime, In::PRIMARY) {
        Some(value) => {
            exposure = value.display_value().to_string();
        }
        None => log::error!("Could not extract exposure!"),
    }

    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let size_bytes = fs::metadata(path)?.len();

    let width = exif
        .get_field(Tag::PixelXDimension, exif::In::PRIMARY)
        .and_then(|f| f.value.get_uint(0));
    let height = exif
        .get_field(Tag::PixelYDimension, exif::In::PRIMARY)
        .and_then(|f| f.value.get_uint(0));
    let dimensions = match (width, height) {
        (Some(w), Some(h)) => Some((w, h)),
        _ => None,
    };

    Ok(ImageInfo {
        path: path.display().to_string(),
        filename,
        size_bytes,
        dimensions,
        camera_model,
        lens_model,
        aperture,
        iso,
        exposure,
    })
}
