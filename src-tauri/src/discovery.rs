use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryEnv {
    pub home: String,
    pub platform: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListedEntry {
    pub name: String,
    pub kind: String,
    pub mtime_ms: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDirResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entries: Option<Vec<ListedEntry>>,
}

fn platform_id() -> &'static str {
    match std::env::consts::OS {
        "windows" => "windows",
        "macos" => "macos",
        _ => "linux",
    }
}

fn resolve_home() -> Result<String, String> {
    if cfg!(windows) {
        std::env::var("USERPROFILE").map_err(|_| {
            "USERPROFILE is not set; cannot resolve Documents save path".to_string()
        })
    } else {
        std::env::var("HOME")
            .map_err(|_| "HOME is not set; cannot resolve save path".to_string())
    }
}

fn mtime_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Return user home and OS family for TypeScript SlotData discovery.
#[tauri::command]
pub fn discovery_env() -> Result<DiscoveryEnv, String> {
    Ok(DiscoveryEnv {
        home: resolve_home()?,
        platform: platform_id().to_string(),
    })
}

/// List a candidate save directory. Missing dirs → `missing`; ACL failures → `permission`.
#[tauri::command]
pub fn discovery_list_dir(path: String) -> Result<ListDirResult, String> {
    let dir = Path::new(&path);
    if !dir.exists() {
        return Ok(ListDirResult {
            status: "missing".to_string(),
            path: None,
            message: None,
            entries: None,
        });
    }
    if !dir.is_dir() {
        return Ok(ListDirResult {
            status: "missing".to_string(),
            path: None,
            message: None,
            entries: None,
        });
    }

    let read = fs::read_dir(dir);
    let entries_iter = match read {
        Ok(iter) => iter,
        Err(err) if err.kind() == std::io::ErrorKind::PermissionDenied => {
            return Ok(ListDirResult {
                status: "permission".to_string(),
                path: Some(path.clone()),
                message: Some(format!(
                    "Permission denied reading save directory: {path}"
                )),
                entries: None,
            });
        }
        Err(err) => {
            return Err(format!("Failed to read save directory {path}: {err}"));
        }
    };

    let mut entries = Vec::new();
    for entry in entries_iter {
        let entry = match entry {
            Ok(e) => e,
            Err(err) if err.kind() == std::io::ErrorKind::PermissionDenied => {
                return Ok(ListDirResult {
                    status: "permission".to_string(),
                    path: Some(path.clone()),
                    message: Some(format!(
                        "Permission denied reading save directory: {path}"
                    )),
                    entries: None,
                });
            }
            Err(err) => {
                return Err(format!("Failed to read save directory {path}: {err}"));
            }
        };

        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(err) if err.kind() == std::io::ErrorKind::PermissionDenied => {
                return Ok(ListDirResult {
                    status: "permission".to_string(),
                    path: Some(path.clone()),
                    message: Some(format!(
                        "Permission denied reading save directory: {path}"
                    )),
                    entries: None,
                });
            }
            Err(_) => continue,
        };

        let kind = if meta.is_dir() { "dir" } else { "file" };
        entries.push(ListedEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            kind: kind.to_string(),
            mtime_ms: mtime_ms(&meta),
        });
    }

    Ok(ListDirResult {
        status: "ok".to_string(),
        path: None,
        message: None,
        entries: Some(entries),
    })
}
