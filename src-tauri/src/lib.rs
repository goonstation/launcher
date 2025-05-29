// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::OnceLock;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;

/// Shared state to track the DreamSeeker process
static DREAMSEEKER_PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();

mod discord;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize Discord Rich Presence when the application starts
    if let Err(e) = discord::init_discord_rpc() {
        eprintln!("Failed to initialize Discord Rich Presence: {}", e);
        // Continue execution even if Discord RPC fails
    }

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            launch_dreamseeker,
            is_dreamseeker_running,
            discord::set_launcher_activity,
            discord::set_in_game_activity,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");


    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            if let Err(e) = discord::cleanup_discord_rpc() {
                eprintln!("Failed to clean up Discord Rich Presence during exit: {}", e);
            }
        }
    });
}


/// ## Arguments
///
/// * `byond_path` - A string slice that holds the path to the BYOND installation directory.
/// * `server_address` - A string slice representing the server address in the format "address:port".
///
/// ## Returns
///
/// * `Ok(String)` containing a success message if DreamSeeker was successfully launched.
/// * `Err(String)` containing an error message if the executable was not found or failed to launch.
#[tauri::command]
fn launch_dreamseeker(byond_path: &str, server_address: &str) -> Result<String, String> {
    let mut path = PathBuf::from(byond_path);
    path.push("bin");
    path.push("dreamseeker.exe");

    println!(
        "Launching DreamSeeker at: {:?} with address {}",
        path, server_address
    );

    if !path.exists() {
        return Err(format!(
            "DreamSeeker executable not found at {}",
            path.display()
        ));
    }

    let result = Command::new(&path).arg(server_address).spawn();

    match result {
        Ok(child) => {
            DREAMSEEKER_PROCESS.get_or_init(|| Mutex::new(None)).lock().unwrap().replace(child);
            Ok(format!("Started DreamSeeker for {}", server_address))
        }
        Err(e) => Err(format!("Failed to launch DreamSeeker: {}", e)),
    }
}

/// Check if DreamSeeker is still running
#[tauri::command]
fn is_dreamseeker_running() -> bool {
    if let Some(process_mutex) = DREAMSEEKER_PROCESS.get() {
        let mut process_guard = process_mutex.lock().unwrap();
        if let Some(child) = &mut *process_guard {
            match child.try_wait() {
                Ok(Some(_)) => false, // Process has exited
                Ok(None) => true,     // Process is still running
                Err(_) => false,      // Error occurred, assume not running
            }
        } else {
            false // No process tracked
        }
    } else {
        false // No process initialized
    }
}

