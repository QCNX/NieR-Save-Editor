use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
#[cfg(not(windows))]
use std::fs::File;
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

const BACKUP_DIR_NAME: &str = "nier-save-editor-backup";

#[derive(Clone, Copy)]
enum BackupReason {
    Manual,
    BeforeSave,
    BeforeImport,
    BeforeRestore,
}

impl BackupReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::Manual => "manual",
            Self::BeforeSave => "before-save",
            Self::BeforeImport => "before-import",
            Self::BeforeRestore => "before-restore",
        }
    }
}

impl TryFrom<&str> for BackupReason {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "manual" => Ok(Self::Manual),
            "before-save" => Ok(Self::BeforeSave),
            "before-import" => Ok(Self::BeforeImport),
            "before-restore" => Ok(Self::BeforeRestore),
            _ => Err(format!("Unsupported backup reason: {value}")),
        }
    }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupEntry {
    pub path: String,
    pub slot_file_name: String,
    pub reason: String,
    pub size: u64,
    pub mtime_ms: u64,
    pub sha256: String,
    pub metadata_status: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupSidecar {
    schema_version: u8,
    slot_file_name: String,
    reason: String,
    size: u64,
    created_at_ms: u64,
    sha256: String,
}

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn file_mtime_ms(path: &Path) -> u64 {
    path.metadata()
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn source_identity(source: &Path) -> Result<(String, String, PathBuf), String> {
    if !source.is_file() {
        return Err(format!("Save file not found: {}", source.display()));
    }
    let file_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("Save path has no valid file name: {}", source.display()))?
        .to_string();
    let stem = source
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("slot");
    let safe_stem: String = stem
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect();
    let parent = source
        .parent()
        .ok_or_else(|| format!("Save path has no parent: {}", source.display()))?;
    Ok((file_name, safe_stem, parent.join(BACKUP_DIR_NAME)))
}

fn write_new_synced(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let mut file = OpenOptions::new().write(true).create_new(true).open(path)?;
    file.write_all(bytes).and_then(|_| file.sync_all())
}

fn create_versioned_backup_at(
    source: &Path,
    reason: BackupReason,
    created_at_ms: u64,
) -> Result<BackupEntry, String> {
    let (slot_file_name, safe_stem, backup_root) = source_identity(source)?;
    let bytes = fs::read(source)
        .map_err(|error| format!("Failed to read save file {}: {error}", source.display()))?;
    let digest = sha256_hex(&bytes);
    let version_dir = backup_root.join(safe_stem);
    fs::create_dir_all(&version_dir).map_err(|error| {
        format!(
            "Failed to create backup directory {}: {error}",
            version_dir.display()
        )
    })?;

    for collision in 0..10_000_u16 {
        let stem = format!("{created_at_ms:013}Z_{}_{collision:03}", reason.as_str());
        let final_path = version_dir.join(format!("{stem}.dat"));
        if final_path.exists() {
            continue;
        }
        let temp_path = version_dir.join(format!(".{stem}.dat.tmp"));
        if let Err(error) = write_new_synced(&temp_path, &bytes) {
            if error.kind() == ErrorKind::AlreadyExists {
                continue;
            }
            return Err(format!(
                "Failed to create backup {}: {error}",
                temp_path.display()
            ));
        }
        match fs::rename(&temp_path, &final_path) {
            Ok(()) => {
                let sidecar = BackupSidecar {
                    schema_version: 1,
                    slot_file_name: slot_file_name.clone(),
                    reason: reason.as_str().to_string(),
                    size: bytes.len() as u64,
                    created_at_ms,
                    sha256: digest.clone(),
                };
                let sidecar_bytes = serde_json::to_vec_pretty(&sidecar)
                    .map_err(|error| format!("Failed to encode backup metadata: {error}"))?;
                let sidecar_path = final_path.with_extension("json");
                let sidecar_temp = version_dir.join(format!(".{stem}.json.tmp"));
                write_new_synced(&sidecar_temp, &sidecar_bytes).map_err(|error| {
                    format!(
                        "Failed to create backup metadata {}: {error}",
                        sidecar_temp.display()
                    )
                })?;
                fs::rename(&sidecar_temp, &sidecar_path).map_err(|error| {
                    format!(
                        "Failed to commit backup metadata {}: {error}",
                        sidecar_path.display()
                    )
                })?;
                return Ok(BackupEntry {
                    path: final_path.to_string_lossy().into_owned(),
                    slot_file_name,
                    reason: reason.as_str().to_string(),
                    size: bytes.len() as u64,
                    mtime_ms: created_at_ms,
                    sha256: digest,
                    metadata_status: "ok".to_string(),
                });
            }
            Err(_) => {
                let _ = fs::remove_file(&temp_path);
            }
        }
    }
    Err(format!(
        "Could not allocate a unique backup path for {}",
        source.display()
    ))
}

fn entry_from_version(path: &Path, slot_file_name: &str) -> Option<BackupEntry> {
    if !path.is_file() || path.extension().and_then(|ext| ext.to_str()) != Some("dat") {
        return None;
    }
    let bytes = fs::read(path).ok()?;
    let digest = sha256_hex(&bytes);
    let sidecar_path = path.with_extension("json");
    let parsed = fs::read(&sidecar_path)
        .ok()
        .and_then(|json| serde_json::from_slice::<BackupSidecar>(&json).ok());
    let (reason, mtime_ms, metadata_status) = match parsed {
        Some(sidecar)
            if sidecar.schema_version == 1
                && BackupReason::try_from(sidecar.reason.as_str()).is_ok()
                && sidecar.slot_file_name == slot_file_name
                && sidecar.size == bytes.len() as u64
                && sidecar.sha256 == digest =>
        {
            (sidecar.reason, sidecar.created_at_ms, "ok")
        }
        Some(_) => ("manual".to_string(), file_mtime_ms(path), "invalid"),
        None if sidecar_path.exists() => ("manual".to_string(), file_mtime_ms(path), "invalid"),
        None => ("manual".to_string(), file_mtime_ms(path), "missing"),
    };
    Some(BackupEntry {
        path: path.to_string_lossy().into_owned(),
        slot_file_name: slot_file_name.to_string(),
        reason,
        size: bytes.len() as u64,
        mtime_ms,
        sha256: digest,
        metadata_status: metadata_status.to_string(),
    })
}

fn list_backups_impl(source: &Path) -> Result<Vec<BackupEntry>, String> {
    let (slot_file_name, safe_stem, backup_root) = source_identity(source)?;
    let mut entries = Vec::new();
    let version_dir = backup_root.join(safe_stem);
    if version_dir.is_dir() {
        let read_dir = fs::read_dir(&version_dir).map_err(|error| {
            format!(
                "Failed to list backup directory {}: {error}",
                version_dir.display()
            )
        })?;
        for item in read_dir.flatten() {
            if let Some(entry) = entry_from_version(&item.path(), &slot_file_name) {
                entries.push(entry);
            }
        }
    }
    let legacy = backup_root.join(&slot_file_name);
    if legacy.is_file() {
        let bytes = fs::read(&legacy).map_err(|error| {
            format!("Failed to read legacy backup {}: {error}", legacy.display())
        })?;
        entries.push(BackupEntry {
            path: legacy.to_string_lossy().into_owned(),
            slot_file_name,
            reason: "legacy".to_string(),
            size: bytes.len() as u64,
            mtime_ms: file_mtime_ms(&legacy),
            sha256: sha256_hex(&bytes),
            metadata_status: "legacy".to_string(),
        });
    }
    entries.sort_by(|left, right| {
        right
            .mtime_ms
            .cmp(&left.mtime_ms)
            .then_with(|| right.path.cmp(&left.path))
    });
    Ok(entries)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SafeWriteResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backup: Option<BackupEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phase: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actual: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_sha256: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actual_sha256: Option<String>,
}

fn safe_failure(status: &str, phase: &str, path: &Path, message: String) -> SafeWriteResult {
    SafeWriteResult {
        status: status.to_string(),
        path: Some(path.to_string_lossy().into_owned()),
        backup: None,
        sha256: None,
        phase: Some(phase.to_string()),
        message: Some(message),
        expected: None,
        actual: None,
        expected_sha256: None,
        actual_sha256: None,
    }
}

fn stage_bytes(target: &Path, bytes: &[u8], label: &str) -> Result<PathBuf, String> {
    let parent = target
        .parent()
        .ok_or_else(|| format!("Target path has no parent: {}", target.display()))?;
    let name = target
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("SlotData.dat");
    for collision in 0..10_000_u16 {
        let candidate = parent.join(format!(
            ".{name}.nier-save-editor.{label}.{}.{collision:03}.tmp",
            now_ms()
        ));
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&candidate)
        {
            Ok(mut file) => {
                if let Ok(metadata) = target.metadata() {
                    let _ = file.set_permissions(metadata.permissions());
                }
                if let Err(error) = file.write_all(bytes).and_then(|_| file.sync_all()) {
                    drop(file);
                    let _ = fs::remove_file(&candidate);
                    return Err(format!(
                        "Failed to persist {}: {error}",
                        candidate.display()
                    ));
                }
                let length = file
                    .metadata()
                    .map_err(|error| format!("Failed to inspect {}: {error}", candidate.display()))?
                    .len();
                if length != bytes.len() as u64 {
                    drop(file);
                    let _ = fs::remove_file(&candidate);
                    return Err(format!(
                        "Staged save has wrong size: expected {}, got {length}",
                        bytes.len()
                    ));
                }
                return Ok(candidate);
            }
            Err(error) if error.kind() == ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "Failed to stage save {}: {error}",
                    candidate.display()
                ));
            }
        }
    }
    Err(format!(
        "Could not allocate a unique temporary file beside {}",
        target.display()
    ))
}

#[cfg(windows)]
fn platform_replace(staged: &Path, target: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    let staged_wide: Vec<u16> = staged.as_os_str().encode_wide().chain(Some(0)).collect();
    let target_wide: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    let result = unsafe {
        MoveFileExW(
            staged_wide.as_ptr(),
            target_wide.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if result == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn platform_replace(staged: &Path, target: &Path) -> std::io::Result<()> {
    fs::rename(staged, target)?;
    if let Some(parent) = target.parent() {
        File::open(parent)?.sync_all()?;
    }
    Ok(())
}

fn safe_write_with<F>(
    target: &Path,
    bytes: &[u8],
    reason: BackupReason,
    expected_target_sha256: Option<&str>,
    mut commit: F,
) -> SafeWriteResult
where
    F: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    const SAVE_SIZE: usize = 235_980;
    if bytes.len() != SAVE_SIZE {
        let mut result = safe_failure(
            "invalid-size",
            "validate-source",
            target,
            format!(
                "Invalid PC SlotData size: expected {SAVE_SIZE} bytes, got {}",
                bytes.len()
            ),
        );
        result.expected = Some(SAVE_SIZE as u64);
        result.actual = Some(bytes.len() as u64);
        return result;
    }
    if !target.is_file() {
        return safe_failure(
            "missing",
            "check-target",
            target,
            format!("Save file not found: {}", target.display()),
        );
    }
    let original = match fs::read(target) {
        Ok(value) => value,
        Err(error) => {
            return safe_failure(
                map_io_kind(error.kind()),
                "check-target",
                target,
                format!("Failed to read target {}: {error}", target.display()),
            );
        }
    };
    let original_sha = sha256_hex(&original);
    if let Some(expected) = expected_target_sha256 {
        if expected != original_sha {
            let mut result = safe_failure(
                "conflict",
                "check-target",
                target,
                format!(
                    "Save file changed before it could be written: {}",
                    target.display()
                ),
            );
            result.expected_sha256 = Some(expected.to_string());
            result.actual_sha256 = Some(original_sha);
            return result;
        }
    }

    let backup = match create_versioned_backup_at(target, reason, now_ms()) {
        Ok(value) => value,
        Err(message) => {
            return safe_failure("backup", "backup-target", target, message);
        }
    };
    let staged = match stage_bytes(target, bytes, "write") {
        Ok(value) => value,
        Err(message) => {
            let mut result = safe_failure("error", "stage-write", target, message);
            result.backup = Some(backup);
            return result;
        }
    };
    if let Err(error) = commit(&staged, target) {
        let _ = fs::remove_file(&staged);
        let mut result = safe_failure(
            map_io_kind(error.kind()),
            "replace-target",
            target,
            format!("Failed to replace target {}: {error}", target.display()),
        );
        result.backup = Some(backup);
        return result;
    }

    let verify = fs::read(target);
    if !matches!(&verify, Ok(actual) if actual == bytes) {
        let recovery_message =
            match stage_bytes(target, &original, "rollback").and_then(|rollback| {
                commit(&rollback, target).map_err(|error| {
                    let _ = fs::remove_file(&rollback);
                    format!("rollback failed: {error}")
                })
            }) {
                Ok(()) => "The original target was restored from the recovery bytes.".to_string(),
                Err(error) => format!("The recovery backup remains available; {error}"),
            };
        let mut result = safe_failure(
            "verify",
            "verify-target",
            target,
            format!("Written save did not match the intended bytes. {recovery_message}"),
        );
        result.backup = Some(backup);
        return result;
    }

    SafeWriteResult {
        status: "ok".to_string(),
        path: Some(target.to_string_lossy().into_owned()),
        backup: Some(backup),
        sha256: Some(sha256_hex(bytes)),
        phase: None,
        message: None,
        expected: None,
        actual: None,
        expected_sha256: None,
        actual_sha256: None,
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadFileResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<Vec<u8>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backup: Option<BackupEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phase: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupListResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backups: Option<Vec<BackupEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phase: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
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
            sha256: Some(sha256_hex(&bytes)),
            bytes: Some(bytes),
            path: None,
            message: None,
        }),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(ReadFileResult {
            status: "missing".to_string(),
            bytes: None,
            sha256: None,
            path: Some(path.clone()),
            message: Some(format!("Save file not found: {path}")),
        }),
        Err(err) if err.kind() == ErrorKind::PermissionDenied => Ok(ReadFileResult {
            status: "permission".to_string(),
            bytes: None,
            sha256: None,
            path: Some(path.clone()),
            message: Some(format!("Permission denied reading save file: {path}")),
        }),
        Err(err) => Ok(ReadFileResult {
            status: "error".to_string(),
            bytes: None,
            sha256: None,
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

/// Snapshot the bytes currently on disk to a unique immutable version.
#[tauri::command]
pub fn persist_create_versioned_backup(
    source_path: String,
    reason: String,
) -> Result<BackupResult, String> {
    let parsed_reason = match BackupReason::try_from(reason.as_str()) {
        Ok(value) => value,
        Err(message) => {
            return Ok(BackupResult {
                status: "error".to_string(),
                backup: None,
                phase: Some("backup-target".to_string()),
                path: Some(source_path),
                message: Some(message),
            });
        }
    };
    match create_versioned_backup_at(Path::new(&source_path), parsed_reason, now_ms()) {
        Ok(backup) => Ok(BackupResult {
            status: "ok".to_string(),
            backup: Some(backup),
            phase: None,
            path: None,
            message: None,
        }),
        Err(message) => Ok(BackupResult {
            status: if Path::new(&source_path).exists() {
                "error"
            } else {
                "missing"
            }
            .to_string(),
            backup: None,
            phase: Some("backup-target".to_string()),
            path: Some(source_path),
            message: Some(message),
        }),
    }
}

/// List immutable versions for one slot, including the read-only legacy copy.
#[tauri::command]
pub fn persist_list_backups(source_path: String) -> Result<BackupListResult, String> {
    match list_backups_impl(Path::new(&source_path)) {
        Ok(backups) => Ok(BackupListResult {
            status: "ok".to_string(),
            backups: Some(backups),
            phase: None,
            path: None,
            message: None,
        }),
        Err(message) => Ok(BackupListResult {
            status: if Path::new(&source_path).exists() {
                "error"
            } else {
                "missing"
            }
            .to_string(),
            backups: None,
            phase: Some("list-backups".to_string()),
            path: Some(source_path),
            message: Some(message),
        }),
    }
}

/// Backup, stage, atomically replace, and verify one existing PC SlotData target.
#[tauri::command]
pub fn persist_safe_write_file(
    target_path: String,
    bytes: Vec<u8>,
    reason: String,
    expected_source_sha256: Option<String>,
    expected_target_sha256: Option<String>,
) -> Result<SafeWriteResult, String> {
    let parsed_reason = match BackupReason::try_from(reason.as_str()) {
        Ok(BackupReason::Manual) | Err(_) => {
            return Ok(safe_failure(
                "error",
                "validate-source",
                Path::new(&target_path),
                format!("Unsupported safe-write backup reason: {reason}"),
            ));
        }
        Ok(value) => value,
    };
    if bytes.len() == 235_980 {
        if let Some(expected) = expected_source_sha256 {
            let actual = sha256_hex(&bytes);
            if expected != actual {
                let mut result = safe_failure(
                    "integrity",
                    "validate-source",
                    Path::new(&target_path),
                    "Replacement bytes changed after validation.".to_string(),
                );
                result.expected_sha256 = Some(expected);
                result.actual_sha256 = Some(actual);
                return Ok(result);
            }
        }
    }
    Ok(safe_write_with(
        Path::new(&target_path),
        &bytes,
        parsed_reason,
        expected_target_sha256.as_deref(),
        platform_replace,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    const SAVE_SIZE: usize = 235_980;

    fn synthetic(seed: u8) -> Vec<u8> {
        (0..SAVE_SIZE)
            .map(|index| seed.wrapping_add((index % 251) as u8))
            .collect()
    }

    #[test]
    fn reading_a_file_returns_the_sha256_for_conflict_guards() {
        let temp = tempdir().unwrap();
        let source = temp.path().join("preview.dat");
        fs::write(&source, b"abc").unwrap();

        let result = persist_read_file(source.to_string_lossy().into_owned()).unwrap();

        assert_eq!(result.status, "ok");
        assert_eq!(
            result.sha256.as_deref(),
            Some("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        );
    }

    #[test]
    fn versioned_backups_survive_a_forced_timestamp_collision() {
        let temp = tempdir().unwrap();
        let source = temp.path().join("SlotData_0.dat");
        let first_bytes = synthetic(3);
        fs::write(&source, &first_bytes).unwrap();

        let first =
            create_versioned_backup_at(&source, BackupReason::Manual, 1_700_000_000_123).unwrap();
        let second_bytes = synthetic(9);
        fs::write(&source, &second_bytes).unwrap();
        let second =
            create_versioned_backup_at(&source, BackupReason::Manual, 1_700_000_000_123).unwrap();

        assert_ne!(first.path, second.path);
        assert_eq!(fs::read(first.path).unwrap(), first_bytes);
        assert_eq!(fs::read(second.path).unwrap(), second_bytes);
    }

    #[test]
    fn history_lists_versions_newest_first_and_includes_legacy_file() {
        let temp = tempdir().unwrap();
        let source = temp.path().join("SlotData_1.dat");
        fs::write(&source, synthetic(1)).unwrap();
        let older =
            create_versioned_backup_at(&source, BackupReason::Manual, 9_000_000_000_100).unwrap();
        let newer =
            create_versioned_backup_at(&source, BackupReason::BeforeSave, 9_000_000_000_200)
                .unwrap();
        let legacy = temp
            .path()
            .join("nier-save-editor-backup")
            .join("SlotData_1.dat");
        fs::write(&legacy, synthetic(2)).unwrap();
        fs::create_dir_all(
            temp.path()
                .join("nier-save-editor-backup")
                .join("SlotData_1")
                .join("ignored.dat"),
        )
        .unwrap();

        let history = list_backups_impl(&source).unwrap();

        assert_eq!(history.len(), 3);
        assert_eq!(history[0].path, newer.path);
        assert_eq!(history[1].path, older.path);
        assert_eq!(history[2].reason, "legacy");
        assert_eq!(history[2].path, legacy.to_string_lossy());
    }

    #[test]
    fn history_rejects_untrusted_sidecar_reason_metadata() {
        let temp = tempdir().unwrap();
        let source = temp.path().join("SlotData_0.dat");
        fs::write(&source, synthetic(1)).unwrap();
        let backup =
            create_versioned_backup_at(&source, BackupReason::Manual, 1_700_000_000_300).unwrap();
        let sidecar = Path::new(&backup.path).with_extension("json");
        let mut metadata: serde_json::Value =
            serde_json::from_slice(&fs::read(&sidecar).unwrap()).unwrap();
        metadata["reason"] = serde_json::Value::String("../../unsafe".to_string());
        fs::write(&sidecar, serde_json::to_vec(&metadata).unwrap()).unwrap();

        let listed = list_backups_impl(&source).unwrap();

        assert_eq!(listed[0].metadata_status, "invalid");
        assert_eq!(listed[0].reason, "manual");
    }

    #[test]
    fn safe_write_rejects_wrong_size_before_creating_a_backup() {
        let temp = tempdir().unwrap();
        let target = temp.path().join("SlotData_0.dat");
        let original = synthetic(4);
        fs::write(&target, &original).unwrap();

        let result = safe_write_with(
            &target,
            &[1, 2, 3],
            BackupReason::BeforeSave,
            None,
            platform_replace,
        );

        assert_eq!(result.status, "invalid-size");
        assert_eq!(result.phase.as_deref(), Some("validate-source"));
        assert_eq!(fs::read(&target).unwrap(), original);
        assert!(!temp.path().join(BACKUP_DIR_NAME).exists());
    }

    #[test]
    fn safe_write_rejects_a_source_hash_mismatch_before_mutation() {
        let temp = tempdir().unwrap();
        let target = temp.path().join("SlotData_0.dat");
        let original = synthetic(4);
        fs::write(&target, &original).unwrap();

        let result = persist_safe_write_file(
            target.to_string_lossy().into_owned(),
            synthetic(5),
            "before-import".to_string(),
            Some("wrong-source-hash".to_string()),
            Some(sha256_hex(&original)),
        )
        .unwrap();

        assert_eq!(result.status, "integrity");
        assert_eq!(result.phase.as_deref(), Some("validate-source"));
        assert_eq!(fs::read(&target).unwrap(), original);
        assert!(!temp.path().join(BACKUP_DIR_NAME).exists());
    }

    #[test]
    fn safe_write_detects_a_target_hash_conflict_before_backup() {
        let temp = tempdir().unwrap();
        let target = temp.path().join("SlotData_0.dat");
        let original = synthetic(5);
        fs::write(&target, &original).unwrap();

        let result = safe_write_with(
            &target,
            &synthetic(6),
            BackupReason::BeforeSave,
            Some("not-the-current-hash"),
            platform_replace,
        );

        assert_eq!(result.status, "conflict");
        assert_eq!(result.phase.as_deref(), Some("check-target"));
        assert_eq!(fs::read(&target).unwrap(), original);
        assert!(!temp.path().join(BACKUP_DIR_NAME).exists());
    }

    #[test]
    fn backup_failure_prevents_all_target_mutation() {
        let temp = tempdir().unwrap();
        let target = temp.path().join("SlotData_0.dat");
        let original = synthetic(5);
        fs::write(&target, &original).unwrap();
        fs::write(
            temp.path().join(BACKUP_DIR_NAME),
            b"blocks backup directory",
        )
        .unwrap();

        let result = safe_write_with(
            &target,
            &synthetic(6),
            BackupReason::BeforeSave,
            Some(&sha256_hex(&original)),
            platform_replace,
        );

        assert_eq!(result.status, "backup");
        assert_eq!(result.phase.as_deref(), Some("backup-target"));
        assert_eq!(fs::read(&target).unwrap(), original);
    }

    #[test]
    fn safe_write_commits_intended_bytes_and_preserves_the_original_version() {
        let temp = tempdir().unwrap();
        let target = temp.path().join("SlotData_0.dat");
        let original = synthetic(12);
        let intended = synthetic(13);
        fs::write(&target, &original).unwrap();

        let result = safe_write_with(
            &target,
            &intended,
            BackupReason::BeforeSave,
            Some(&sha256_hex(&original)),
            platform_replace,
        );

        assert_eq!(result.status, "ok");
        assert_eq!(fs::read(&target).unwrap(), intended);
        let backup = result.backup.expect("before-save backup");
        assert_eq!(backup.reason, "before-save");
        assert_eq!(fs::read(backup.path).unwrap(), original);
    }

    #[test]
    fn failed_commit_keeps_the_original_and_a_recovery_backup() {
        let temp = tempdir().unwrap();
        let target = temp.path().join("SlotData_1.dat");
        let original = synthetic(7);
        fs::write(&target, &original).unwrap();

        let result = safe_write_with(
            &target,
            &synthetic(8),
            BackupReason::BeforeImport,
            Some(&sha256_hex(&original)),
            |_staged, _target| Err(std::io::Error::other("forced commit failure")),
        );

        assert_eq!(result.status, "error");
        assert_eq!(result.phase.as_deref(), Some("replace-target"));
        assert_eq!(fs::read(&target).unwrap(), original);
        let backup = result.backup.expect("recovery backup");
        assert_eq!(fs::read(backup.path).unwrap(), original);
    }

    #[test]
    fn verification_mismatch_restores_the_original_from_backup() {
        let temp = tempdir().unwrap();
        let target = temp.path().join("SlotData_2.dat");
        let original = synthetic(10);
        fs::write(&target, &original).unwrap();
        let intended = synthetic(11);
        let mut commits = 0;

        let result = safe_write_with(
            &target,
            &intended,
            BackupReason::BeforeRestore,
            Some(&sha256_hex(&original)),
            |staged, target| {
                commits += 1;
                if commits == 1 {
                    fs::write(target, synthetic(99))
                } else {
                    platform_replace(staged, target)
                }
            },
        );

        assert_eq!(result.status, "verify");
        assert_eq!(result.phase.as_deref(), Some("verify-target"));
        assert_eq!(fs::read(&target).unwrap(), original);
    }
}
