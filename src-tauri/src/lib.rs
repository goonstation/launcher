// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::path::PathBuf;
use std::process::Command;

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

    println!("Launching DreamSeeker at: {:?} with address {}", path, server_address);

    if !path.exists() {
        return Err(format!("DreamSeeker executable not found at {}", path.display()));
    }

    // Launch dreamseeker with the server address as argument
    let result = Command::new(&path)
        .arg(server_address)
        .spawn();

    match result {
        Ok(_) => Ok(format!("Started DreamSeeker for {}", server_address)),
        Err(e) => Err(format!("Failed to launch DreamSeeker: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![launch_dreamseeker])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
