// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Check if the target platform is Windows
    #[cfg(not(target_os = "windows"))]
    {
        eprintln!("Error: Goonstation Launcher is only supported on Windows.");
        std::process::exit(1);
    }

    // Continue with the normal application initialization
    #[cfg(target_os = "windows")]
    {
        goon_launcher_tauri_lib::run()
    }
}
