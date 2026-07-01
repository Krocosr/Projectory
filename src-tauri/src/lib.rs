use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(serde::Deserialize)]
struct LaunchItem {
    name: String,
    #[serde(rename = "type")]
    item_type: String,
    path: String,
    command: Option<String>,
    working_dir: Option<String>,
    wait: Option<bool>,
}

struct AppState {
    active_pids: Mutex<HashMap<String, u32>>,
}

#[tauri::command]
async fn launch_items(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    items: Vec<LaunchItem>,
) -> Result<(), String> {
    let mut errors: Vec<String> = Vec::new();

    for item in &items {
        let result = match item.item_type.as_str() {
            "app" => try_spawn_app(&app, &state, item),
            "file" | "url" => app.opener()
                .open_path(&item.path, None::<&str>)
                .map_err(|e| format!("{}: {}", item.name, e)),
            "command" => spawn_command(&state, item),
            _ => Ok(()),
        };
        if let Err(e) = result {
            errors.push(e);
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("; "))
    }
}

fn try_spawn_app(app: &tauri::AppHandle, state: &AppState, item: &LaunchItem) -> Result<(), String> {
    let mut cmd = std::process::Command::new(&item.path);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    match cmd.spawn() {
        Ok(child) => {
            state.active_pids.lock().unwrap().insert(item.name.clone(), child.id());
            Ok(())
        }
        Err(_) => app.opener()
            .open_path(&item.path, None::<&str>)
            .map_err(|e| format!("{}: {}", item.name, e)),
    }
}

fn spawn_command(state: &AppState, item: &LaunchItem) -> Result<(), String> {
    let cmd_str = item.command.as_deref().unwrap_or("");
    let cwd = item.working_dir.as_deref().unwrap_or(".");

    let (program, args): (&str, Vec<&str>) = if cfg!(target_os = "windows") {
        ("cmd.exe", vec!["/c", cmd_str])
    } else {
        ("/bin/sh", vec!["-c", cmd_str])
    };

    let mut cmd = std::process::Command::new(program);
    cmd.args(&args).current_dir(cwd);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd.spawn().map_err(|e| format!("{}: {}", item.name, e))?;
    let pid = child.id();
    state.active_pids.lock().unwrap().insert(item.name.clone(), pid);

    if item.wait.unwrap_or(false) {
        child.wait().ok();
    }

    Ok(())
}

#[tauri::command]
async fn stop_item(
    state: tauri::State<'_, AppState>,
    item_name: String,
) -> Result<(), String> {
    let pid = state.active_pids.lock().unwrap().remove(&item_name);
    if let Some(pid) = pid {
        if cfg!(target_os = "windows") {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F", "/T"])
                .spawn();
        } else {
            let _ = std::process::Command::new("kill")
                .args(["-9", &pid.to_string()])
                .spawn();
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![launch_items, stop_item])
        .setup(|app| {
            app.manage(AppState {
                active_pids: Mutex::new(HashMap::new()),
            });
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_title("Projectory");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
