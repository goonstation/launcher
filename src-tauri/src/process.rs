use std::process::{Child, Command};
use std::sync::Mutex;
use std::{path::PathBuf, sync::OnceLock};
use sysinfo::{ProcessRefreshKind, System};

/// Shared state to track the DreamSeeker process
static DREAMSEEKER_PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();

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
pub fn launch_dreamseeker(byond_path: &str, server_address: &str) -> Result<String, String> {
  let mut path = PathBuf::from(byond_path);
  path.push("bin");
  path.push("dreamseeker.exe");

  println!("Launching DreamSeeker at: {path:?} with address {server_address}");

  if !path.exists() {
    return Err(format!(
      "DreamSeeker executable not found at {}",
      path.display()
    ));
  }

  let result = Command::new(&path).arg(server_address).spawn();

  match result {
    Ok(child) => {
      DREAMSEEKER_PROCESS
        .get_or_init(|| Mutex::new(None))
        .lock()
        .unwrap()
        .replace(child);
      Ok(format!("Started DreamSeeker for {server_address}"))
    }
    Err(e) => Err(format!("Failed to launch DreamSeeker: {e}")),
  }
}

/// Check if our directly spawned DreamSeeker process is still running
///
/// This function checks if the specific child process we launched is still running
#[tauri::command]
pub fn is_dreamseeker_running() -> bool {
  if let Some(process_mutex) = DREAMSEEKER_PROCESS.get() {
    let mut process_guard = process_mutex.lock().unwrap();
    if let Some(child) = &mut *process_guard {
      let pid = child.id() as usize;

      match child.try_wait() {
        Ok(Some(status)) => {
          println!("DreamSeeker process exited with status: {status:?}");
          *process_guard = None;
          false
        }
        Ok(None) => {
          println!("DreamSeeker process with PID {pid} is still running");
          true
        }
        Err(e) => {
          println!("Error checking DreamSeeker process: {e}");
          *process_guard = None;
          false
        }
      }
    } else {
      println!("No DreamSeeker process is being tracked");
      false
    }
  } else {
    println!("Process tracking not initialized");
    false
  }
}

/// Check if any DreamSeeker process is running by enumerating processes
/// This is used when we don't spawn the process directly (like when using BYOND pager)
#[tauri::command]
pub fn find_dreamseeker_process() -> bool {
  println!("Searching for dreamseeker.exe process");

  let mut system = System::new();
  system.refresh_processes_specifics(
    sysinfo::ProcessesToUpdate::All,
    true,
    ProcessRefreshKind::everything(),
  );

  let dreamseeker_running = system.processes().iter().any(|(pid, process)| {
    let name = process.name().to_ascii_lowercase();
    if name == "dreamseeker.exe" {
      println!("Found DreamSeeker process: PID {}", pid.as_u32());
      true
    } else {
      false
    }
  });

  if !dreamseeker_running {
    println!("DreamSeeker process not found");
  }

  dreamseeker_running
}
