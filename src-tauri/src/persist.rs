use serde::Serialize;
use std::fs;
use std::io::ErrorKind;
use std::path::Path;
use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadFileResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<Vec<u8>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IoResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAsDialogResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

fn io_ok() -> IoResult {
    IoResult {
        status: "ok".to_string(),
        path: None,
        message: None,
    }
}

fn io_fail(status: &str, path: &str, message: String) -> IoResult {
    IoResult {
        status: status.to_string(),
        path: Some(path.to_string()),
        message: Some(message),
    }
}

fn map_io_kind(kind: ErrorKind) -> &'static str {
    match kind {
        ErrorKind::NotFound => "missing",
        ErrorKind::PermissionDenied => "permission",
        _ => "error",
    }
}

/// Read raw save file bytes from an explicit user-selected path.
#[tauri::command]
pub fn persist_read_file(path: String) -> Result<ReadFileResult, String> {
    match fs::read(&path) {
        Ok(bytes) => Ok(ReadFileResult {
            status: "ok".to_string(),
            bytes: Some(bytes),
            path: None,
            message: None,
        }),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(ReadFileResult {
            status: "missing".to_string(),
            bytes: None,
            path: Some(path.clone()),
            message: Some(format!("Save file not found: {path}")),
        }),
        Err(err) if err.kind() == ErrorKind::PermissionDenied => Ok(ReadFileResult {
            status: "permission".to_string(),
            bytes: None,
            path: Some(path.clone()),
            message: Some(format!("Permission denied reading save file: {path}")),
        }),
        Err(err) => Ok(ReadFileResult {
            status: "error".to_string(),
            bytes: None,
            path: Some(path.clone()),
            message: Some(format!("Failed to read save file {path}: {err}")),
        }),
    }
}

/// Copy an existing save to a backup path, creating the backup directory as needed.
#[tauri::command]
pub fn persist_backup_file(source_path: String, backup_path: String) -> Result<IoResult, String> {
    let source = Path::new(&source_path);
    if !source.is_file() {
        return Ok(io_fail(
            "missing",
            &source_path,
            format!("Save file not found: {source_path}"),
        ));
    }

    if let Some(parent) = Path::new(&backup_path).parent() {
        if let Err(err) = fs::create_dir_all(parent) {
            let status = map_io_kind(err.kind());
            let message = if err.kind() == ErrorKind::PermissionDenied {
                format!("Permission denied creating backup for: {source_path}")
            } else {
                format!("Failed to create backup directory for {source_path}: {err}")
            };
            return Ok(io_fail(status, &backup_path, message));
        }
    }

    match fs::copy(&source_path, &backup_path) {
        Ok(_) => Ok(io_ok()),
        Err(err) if err.kind() == ErrorKind::PermissionDenied => Ok(io_fail(
            "permission",
            &source_path,
            format!("Permission denied creating backup for: {source_path}"),
        )),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(io_fail(
            "missing",
            &source_path,
            format!("Save file not found: {source_path}"),
        )),
        Err(err) => Ok(io_fail(
            "error",
            &source_path,
            format!("Failed to create backup for {source_path}: {err}"),
        )),
    }
}

/// Write serialized save bytes to an explicit path (current slot or Save As target).
#[tauri::command]
pub fn persist_write_file(path: String, bytes: Vec<u8>) -> Result<IoResult, String> {
    match fs::write(&path, &bytes) {
        Ok(()) => Ok(io_ok()),
        Err(err) if err.kind() == ErrorKind::PermissionDenied => Ok(io_fail(
            "permission",
            &path,
            format!("Permission denied writing save file: {path}"),
        )),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(io_fail(
            "missing",
            &path,
            format!("Save path not found: {path}"),
        )),
        Err(err) => Ok(io_fail(
            "error",
            &path,
            format!("Failed to write save file {path}: {err}"),
        )),
    }
}

/// Open a Save As dialog bound to the app window so it appears on the correct display.
#[tauri::command]
pub fn persist_save_as_dialog(
    app: AppHandle,
    window: WebviewWindow,
    default_path: Option<String>,
    default_name: Option<String>,
) -> Result<SaveAsDialogResult, String> {
    let mut dialog = app.dialog().file();
    dialog = dialog.set_parent(&window);
    dialog = dialog.add_filter("NieR SlotData", &["dat"]);

    if let Some(name) = default_name.as_deref().filter(|s| !s.is_empty()) {
        dialog = dialog.set_file_name(name);
    }

    if let Some(dir) = default_path.as_deref().filter(|s| !s.is_empty()) {
        dialog = dialog.set_directory(dir);
    }

    match dialog.blocking_save_file() {
        None => Ok(SaveAsDialogResult {
            status: "cancelled".to_string(),
            path: None,
        }),
        Some(file_path) => {
            let path = file_path.to_string();
            Ok(SaveAsDialogResult {
                status: "ok".to_string(),
                path: Some(path),
            })
        }
    }
}
