// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod byond;
mod discord;
mod process;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Initialize Discord Rich Presence when the application starts
  // Temporarily disabled Discord Rich Presence - will be added in a later update
  // if let Err(e) = discord::init_discord_rpc() {
  //     eprintln!("Failed to initialize Discord Rich Presence: {}", e);
  //     // Continue execution even if Discord RPC fails
  // }

  let app = tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      process::launch_dreamseeker,
      process::is_dreamseeker_running,
      process::find_dreamseeker_process,
      byond::get_byond_version,
      byond::download_byond_installer,
      byond::install_byond,
      discord::set_launcher_activity,
      discord::set_in_game_activity,
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, event| {
    if let tauri::RunEvent::ExitRequested { .. } = event {
      // Temporarily disabled Discord Rich Presence - will be added in a later update
      // if let Err(e) = discord::cleanup_discord_rpc() {
      //     eprintln!("Failed to clean up Discord Rich Presence during exit: {}", e);
      // }
    }
  });
}
