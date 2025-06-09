use discord_rich_presence::{DiscordIpc, DiscordIpcClient, activity};
use std::sync::Mutex;
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};

const APPLICATION_ID: &str = "1377501813862961244";

static DISCORD_CLIENT: OnceLock<Mutex<Option<DiscordIpcClient>>> = OnceLock::new();

/// Update Discord Rich Presence to show in-game status
#[tauri::command]
pub fn set_in_game_activity(_server_name: &str) -> Result<(), String> {
    // set_discord_activity("In Game", server_name) TODO DISABLED
    Ok(())
}

/// Update Discord Rich Presence to show in-launcher status
#[tauri::command]
pub fn set_launcher_activity() -> Result<(), String> {
    // set_discord_activity("In Launcher", "Browsing servers") TODO DISABLED
    Ok(())
}

/// Initialize Discord Rich Presence
fn get_or_init_client() -> Result<&'static Mutex<Option<DiscordIpcClient>>, String> {
    DISCORD_CLIENT.get_or_init(|| Mutex::new(None));
    Ok(DISCORD_CLIENT.get().unwrap())
}

/// Get current timestamp in seconds since Unix epoch
fn get_current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Create a Discord activity payload based on state
fn create_activity_payload<'a>(state: &'a str, details: &'a str) -> activity::Activity<'a> {
    activity::Activity::new()
        .state(state)
        .details(details)
        .timestamps(activity::Timestamps::new().start(get_current_timestamp()))
}

/// Set Discord activity with reconnect support
fn set_discord_activity(state: &str, details: &str) -> Result<(), String> {
    let client_mutex = get_or_init_client()?;
    let mut client_guard = client_mutex.lock().unwrap();

    let payload = create_activity_payload(state, details);

    if let Some(client) = &mut *client_guard {
        match client.set_activity(payload) {
            Ok(_) => return Ok(()),
            Err(_) => {
                // Connection might be stale, try to reconnect
                if client.reconnect().is_err() {
                    // Reconnection failed, create a new client
                    *client_guard = None;
                }
            }
        }
    }

    // Client doesn't exist or reconnection failed, create a new one
    if client_guard.is_none() {
        match DiscordIpcClient::new(APPLICATION_ID) {
            Ok(mut client) => {
                if let Err(e) = client.connect() {
                    return Err(format!("Failed to connect to Discord: {}", e));
                }

                let payload = create_activity_payload(state, details);
                if let Err(e) = client.set_activity(payload) {
                    return Err(format!("Failed to set activity: {}", e));
                }

                *client_guard = Some(client);
                Ok(())
            }
            Err(e) => Err(format!("Failed to create Discord client: {}", e)),
        }
    } else {
        // Should never reach here since we handle reconnection above
        Err("Failed to set Discord activity".to_string())
    }
}

/// Initialize Discord Rich Presence with default "In Launcher" state
/// This function is called automatically when the app starts
#[allow(dead_code)]
pub fn init_discord_rpc() -> Result<(), String> {
    set_discord_activity("In Launcher", "Browsing servers")
}

/// Clean up the Discord Rich Presence client
#[allow(dead_code)]
pub fn cleanup_discord_rpc() -> Result<(), String> {
    if let Some(client_mutex) = DISCORD_CLIENT.get() {
        let mut client_guard = client_mutex.lock().unwrap();
        if let Some(client) = client_guard.take() {
            drop(client); // This will close the connection
        }
    }
    Ok(())
}
