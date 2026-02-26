use std::collections::hash_map::DefaultHasher;
use std::ffi::OsStr;
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

fn ffmpeg_names() -> &'static [&'static str] {
    if cfg!(target_os = "windows") {
        &["ffmpeg.exe", "ffmpeg"]
    } else {
        &["ffmpeg"]
    }
}

pub fn resolve_ffmpeg_command(resource_dir: Option<&Path>) -> PathBuf {
    if let Some(path) = std::env::var_os("LUMINUS_FFMPEG_PATH") {
        let candidate = PathBuf::from(path);
        if candidate.exists() {
            return candidate;
        }
        log::warn!(
            "LUMINUS_FFMPEG_PATH points to a missing path: {}",
            candidate.display()
        );
    }

    for name in ffmpeg_names() {
        if let Some(dir) = resource_dir {
            let candidate = dir.join(name);
            if candidate.exists() {
                return candidate;
            }
        }
    }

    for name in ffmpeg_names() {
        let exe_candidate = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join(name)));
        if let Some(candidate) = exe_candidate {
            if candidate.exists() {
                return candidate;
            }
        }
    }

    #[cfg(debug_assertions)]
    {
        for name in ffmpeg_names() {
            // Dev-only fallback when running from source without bundled resources.
            let dev_candidate = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../resources")
                .join(name);
            if dev_candidate.exists() {
                return dev_candidate;
            }
        }
    }

    PathBuf::from(ffmpeg_names()[0])
}

pub fn generate_thumbnail(
    video_path: &Path,
    thumbnails_dir: &Path,
    ffmpeg_command: &OsStr,
) -> anyhow::Result<PathBuf> {
    std::fs::create_dir_all(thumbnails_dir)?;
    let out = thumbnail_path_for(video_path, thumbnails_dir);
    if out.exists() {
        return Ok(out);
    }

    let status = Command::new(ffmpeg_command)
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
        anyhow::bail!(
            "ffmpeg command '{}' failed for {}",
            ffmpeg_command.to_string_lossy(),
            video_path.display()
        )
    }
}
