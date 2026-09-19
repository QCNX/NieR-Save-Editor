mod discovery;
mod persist;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            discovery::discovery_env,
            discovery::discovery_list_dir,
            persist::persist_read_file,
            persist::persist_backup_file,
            persist::persist_write_file,
            persist::persist_save_as_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
