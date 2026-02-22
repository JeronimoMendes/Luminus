use std::{fs::File, io::BufReader, path::Path};

use chrono::{DateTime, TimeZone, Utc};
use mp4::{Mp4Reader, TrackType};

use crate::models::VideoMeta;

// MP4 epoch starts at 1904-01-01 00:00:00 UTC
// Unix epoch is 1970-01-01 00:00:00 UTC
// Difference in seconds: 2082844800
const MP4_EPOCH_OFFSET: i64 = 2_082_844_800;

pub fn extract_video_metadata(path: &Path) -> anyhow::Result<VideoMeta> {
    log::info!("Reading video metadata for {}", path.display());

    let file = File::open(path)?;
    let size = file.metadata()?.len();
    let reader = BufReader::new(file);
    let mp4 = Mp4Reader::read_header(reader, size)?;

    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let duration_secs = {
        let d = mp4.duration();
        if d.as_secs_f64() > 0.0 {
            Some(d.as_secs_f64())
        } else {
            None
        }
    };

    // Creation time from mvhd (seconds since 1904-01-01)
    let datetime: Option<DateTime<Utc>> = {
        let creation_time = mp4.moov.mvhd.creation_time;
        if creation_time > 0 {
            let unix_ts = creation_time as i64 - MP4_EPOCH_OFFSET;
            Utc.timestamp_opt(unix_ts, 0).single()
        } else {
            None
        }
    };

    let mut width: Option<u32> = None;
    let mut height: Option<u32> = None;
    let mut fps: Option<f64> = None;
    let mut video_codec: Option<String> = None;
    let mut audio_codec: Option<String> = None;
    let mut bitrate: Option<u32> = None;

    for track in mp4.tracks().values() {
        match track.track_type() {
            Ok(TrackType::Video) => {
                if width.is_none() {
                    width = Some(track.width() as u32);
                    height = Some(track.height() as u32);
                    fps = Some(track.frame_rate());
                    video_codec = track.media_type().ok().map(|m| format!("{m:?}"));
                    let b = track.bitrate();
                    if b > 0 {
                        bitrate = Some(b);
                    }
                }
            }
            Ok(TrackType::Audio) => {
                if audio_codec.is_none() {
                    audio_codec = track.media_type().ok().map(|m| format!("{m:?}"));
                }
            }
            _ => {}
        }
    }

    Ok(VideoMeta {
        path: path.display().to_string(),
        filename,
        duration_secs,
        width,
        height,
        fps,
        video_codec,
        audio_codec,
        bitrate,
        datetime,
        thumbnail_path: None,
    })
}
