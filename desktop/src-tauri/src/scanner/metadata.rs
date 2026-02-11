use chrono::{DateTime, NaiveDateTime, Utc};
use exif::{In, Tag};
use sqlx::{Pool, QueryBuilder, Sqlite};
use std::path::Path;

use crate::models::{PhotographMeta, ScanResult};

fn exif_string(field: &exif::Field) -> String {
    let s = field.display_value().to_string();
    s.trim_matches('"').to_string()
}

pub fn extract_metadata(path: &Path) -> anyhow::Result<PhotographMeta> {
    log::info!("Reading metadata for file {}", path.display());
    let file = std::fs::File::open(path)?;
    let mut bufreader = std::io::BufReader::new(&file);

    let exifreader = exif::Reader::new();
    let exif = exifreader.read_from_container(&mut bufreader)?;

    let mut camera_maker = String::from("Unknown");
    let mut camera_model = String::from("Unknown");
    let mut lens_maker = String::from("Unknown");
    let mut lens_model = String::from("Unknown");
    let mut aperture = String::from("Unknown");
    let mut iso = String::from("Unknown");
    let mut exposure = String::from("Unknown");
    let mut datetime: DateTime<Utc> = Utc::now();
    match exif.get_field(Tag::Make, In::PRIMARY) {
        Some(value) => camera_maker = exif_string(value),
        None => log::error!("Could not extract camera maker!"),
    }
    match exif.get_field(Tag::Model, In::PRIMARY) {
        Some(value) => camera_model = exif_string(value),
        None => log::error!("Could not extract camera model!"),
    }
    match exif.get_field(Tag::LensMake, In::PRIMARY) {
        Some(value) => lens_maker = exif_string(value),
        None => log::error!("Could not extract lens maker!"),
    }
    match exif.get_field(Tag::LensModel, In::PRIMARY) {
        Some(value) => lens_model = exif_string(value),
        None => log::error!("Could not extract lens model!"),
    }
    match exif.get_field(Tag::FNumber, In::PRIMARY) {
        Some(value) => {
            aperture = value.display_value().to_string();
        }
        None => log::error!("Could not extract aperture!"),
    }
    match exif
        .get_field(Tag::PhotographicSensitivity, In::PRIMARY)
        .or_else(|| exif.get_field(Tag::ISOSpeed, In::PRIMARY))
    {
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
    match exif.get_field(Tag::DateTimeOriginal, In::PRIMARY) {
        Some(value) => {
            let raw = value.display_value().to_string();
            let naive = NaiveDateTime::parse_from_str(&raw, "%Y-%m-%d %H:%M:%S")
                .or_else(|_| NaiveDateTime::parse_from_str(&raw, "%Y:%m:%d %H:%M:%S"))?;
            datetime = naive.and_utc();
        }
        None => log::error!("Could not extract datetime!"),
    }

    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let width = exif
        .get_field(Tag::PixelXDimension, exif::In::PRIMARY)
        .and_then(|f| f.value.get_uint(0));
    let height = exif
        .get_field(Tag::PixelYDimension, exif::In::PRIMARY)
        .and_then(|f| f.value.get_uint(0));

    Ok(PhotographMeta {
        path: path.display().to_string(),
        filename,
        datetime,
        width,
        height,
        camera_maker,
        camera_model,
        lens_maker,
        lens_model,
        aperture,
        iso,
        exposure,
    })
}

pub async fn save_photographs(
    scan_result: &ScanResult,
    pool: &Pool<Sqlite>,
) -> Result<(), sqlx::Error> {
    // Batch insert cameras
    let mut cam_qb: QueryBuilder<Sqlite> =
        QueryBuilder::new("INSERT OR IGNORE INTO camera (maker, model) ");
    cam_qb.push_values(scan_result.images.iter(), |mut b, p| {
        b.push_bind(&p.camera_maker).push_bind(&p.camera_model);
    });
    cam_qb.build().execute(pool).await?;

    // Batch insert lenses
    let mut lens_qb: QueryBuilder<Sqlite> =
        QueryBuilder::new("INSERT OR IGNORE INTO lens (maker, model) ");
    lens_qb.push_values(scan_result.images.iter(), |mut b, p| {
        b.push_bind(&p.lens_maker).push_bind(&p.lens_model);
    });
    lens_qb.build().execute(pool).await?;

    // Batch insert photographs
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
        "INSERT OR IGNORE INTO photograph
        (file_path, filename, datetime, aperture, iso, exposure_time, width, height, camera_id, lens_id)
        VALUES ",
    );
    for (i, photo) in scan_result.images.iter().enumerate() {
        if i > 0 {
            qb.push(", ");
        }
        qb.push("(");
        qb.push_bind(&photo.path);
        qb.push(", ").push_bind(&photo.filename);
        qb.push(", ").push_bind(photo.datetime.timestamp());
        qb.push(", ").push_bind(&photo.aperture);
        qb.push(", ").push_bind(&photo.iso);
        qb.push(", ").push_bind(&photo.exposure);
        qb.push(", ").push_bind(photo.width);
        qb.push(", ").push_bind(photo.height);
        qb.push(", (SELECT id FROM camera WHERE maker = ")
            .push_bind(&photo.camera_maker);
        qb.push(" AND model = ")
            .push_bind(&photo.camera_model)
            .push(")");
        qb.push(", (SELECT id FROM lens WHERE maker = ")
            .push_bind(&photo.lens_maker);
        qb.push(" AND model = ")
            .push_bind(&photo.lens_model)
            .push(")");
        qb.push(")");
    }
    qb.build().execute(pool).await?;

    log::info!("Saved {} photographs to database", scan_result.images.len());
    Ok(())
}
