use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;

fn path_hash(path: &Path) -> u64 {
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    hasher.finish()
}

pub fn thumbnail_path_for(video_path: &Path, thumbnails_dir: &Path) -> PathBuf {
    let hash = path_hash(video_path);
    thumbnails_dir.join(format!("{:016x}.jpg", hash))
}

pub fn generate_thumbnail(video_path: &Path, thumbnails_dir: &Path) -> anyhow::Result<PathBuf> {
    std::fs::create_dir_all(thumbnails_dir)?;
    let out = thumbnail_path_for(video_path, thumbnails_dir);
    if out.exists() {
        return Ok(out);
    }

    let status = Command::new("ffmpeg")
        .args([
            "-i",
            video_path.to_str().unwrap_or(""),
            "-vframes",
            "1",
            "-ss",
            "0.5",
            "-vf",
            "scale=400:-1",
            "-f",
            "image2",
            "-y",
            out.to_str().unwrap_or(""),
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()?;

    if status.success() {
        Ok(out)
    } else {
        anyhow::bail!("ffmpeg failed for {}", video_path.display())
    }
}
