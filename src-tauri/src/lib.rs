use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct AppState {
    processes: Mutex<HashMap<String, Child>>,
}

#[derive(serde::Deserialize)]
struct LaunchItem {
    id: String,
    name: String,
    #[serde(rename = "type")]
    item_type: String,
    path: String,
    command: Option<String>,
    working_dir: Option<String>,
    wait: Option<bool>,
    kill_on_stop: Option<bool>,
}

#[tauri::command]
async fn launch_items(state: tauri::State<'_, AppState>, items: Vec<LaunchItem>) -> Result<(), String> {
    let mut processes = state.processes.lock().map_err(|e| e.to_string())?;

    for item in &items {
        if item.item_type == "app" {
            let resolved = std::path::PathBuf::from(&item.path);
            if cfg!(target_os = "windows") {
                let child = Command::new("cmd")
                    .args(["/c", "start", "", &resolved.to_string_lossy()])
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                    .map_err(|e| format!("Failed to launch {}: {}", item.name, e))?;
                processes.insert(item.id.clone(), child);
            } else {
                let child = Command::new("open")
                    .arg(resolved.as_os_str())
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                    .map_err(|e| format!("Failed to launch {}: {}", item.name, e))?;
                processes.insert(item.id.clone(), child);
            }
        } else if item.item_type == "command" {
            let cwd = item.working_dir.as_deref().unwrap_or(".");
            let cmd = if cfg!(target_os = "windows") { "cmd.exe" } else { "/bin/sh" };
            let args: &[&str] = if cfg!(target_os = "windows") {
                &["/c", item.command.as_deref().unwrap_or("")]
            } else {
                &["-c", item.command.as_deref().unwrap_or("")]
            };

            if item.wait.unwrap_or(false) {
                let child = Command::new(cmd)
                    .args(args)
                    .current_dir(cwd)
                    .stdout(Stdio::inherit())
                    .stderr(Stdio::inherit())
                    .spawn()
                    .map_err(|e| format!("Failed to run command {}: {}", item.name, e))?;
                // Wait for completion
                let _ = child.wait_with_output();
            } else {
                let child = Command::new(cmd)
                    .args(args)
                    .current_dir(cwd)
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                    .map_err(|e| format!("Failed to run command {}: {}", item.name, e))?;
                processes.insert(item.id.clone(), child);
            }
        }
    }

    Ok(())
}

#[tauri::command]
async fn stop_item(state: tauri::State<'_, AppState>, item_id: String) -> Result<(), String> {
    let mut processes = state.processes.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = processes.remove(&item_id) {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

#[tauri::command]
async fn get_active_pids(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let processes = state.processes.lock().map_err(|e| e.to_string())?;
    Ok(processes.keys().cloned().collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            processes: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![launch_items, stop_item, get_active_pids])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_title("Projectory");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
