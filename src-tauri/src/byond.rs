use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::process::Command;
use tauri::{AppHandle, Manager};
use tauri_plugin_http::reqwest;

#[derive(Debug, Deserialize, Serialize)]
pub struct ByondVersion {
    pub major: u32,
    pub minor: u32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DownloadResult {
    pub success: bool,
    pub message: String,
    pub installer_path: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
}

/// Get the version of BYOND installed at the specified path
#[tauri::command]
pub fn get_byond_version(byond_path: &str) -> Result<ByondVersion, String> {
    let dd_path = Path::new(byond_path).join("bin").join("dd.exe");

    if !dd_path.exists() {
        return Err(format!(
            "Dream Daemon executable not found at {}",
            dd_path.display()
        ));
    }

    let mut cmd = Command::new(&dd_path);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd
        .arg("-version")
        .output()
        .map_err(|e| format!("Failed to execute dd.exe: {}", e))?;

    if !output.status.success() {
        return Err(format!("dd.exe failed with status: {}", output.status));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    parse_byond_version(&stdout)
}

/// Parse the version from the Dream Daemon output
/// `dd.exe -version` returns a line like "BYOND 5.0 Public (Version 516.1663) on Microsoft Windows"
fn parse_byond_version(output: &str) -> Result<ByondVersion, String> {
    for line in output.lines() {
        if line.contains("BYOND") && line.contains("Version") {
            // Extract version number from between parentheses
            let start = line.find("Version ");
            let end = line.find(")");

            if let (Some(s), Some(e)) = (start, end) {
                let version_str = &line[s + "Version ".len()..e];

                let parts: Vec<&str> = version_str.split('.').collect();
                if parts.len() != 2 {
                    return Err(format!("Invalid version format: {}", version_str));
                }

                let major = parts[0]
                    .parse::<u32>()
                    .map_err(|e| format!("Failed to parse major version: {}", e))?;
                let minor = parts[1]
                    .parse::<u32>()
                    .map_err(|e| format!("Failed to parse minor version: {}", e))?;

                return Ok(ByondVersion { major, minor });
            }
        }
    }

    Err("Could not find BYOND version in output".to_string())
}

/// Download BYOND installer for a specific version
#[tauri::command]
pub async fn download_byond_installer(
    app_handle: AppHandle,
    major: u32,
    minor: u32,
) -> Result<DownloadResult, String> {
    // Create temp directory for installer
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let download_dir = app_data_dir.join("byond_installer");

    // Create the download directory if it doesn't exist
    if !download_dir.exists() {
        fs::create_dir_all(&download_dir)
            .map_err(|e| format!("Failed to create download directory: {}", e))?;
    }

    let installer_filename = format!("byond_{}.{}_byond.exe", major, minor);
    let installer_path = download_dir.join(&installer_filename);

    // Try primary download URL
    let primary_url = format!(
        "https://www.byond.com/download/build/{}/{}.{}_byond.exe",
        major, major, minor
    );
    let client = reqwest::Client::new();

    match download_file(&primary_url, &installer_path, &client).await {
        Ok(_) => Ok(DownloadResult {
            success: true,
            message: format!(
                "Successfully downloaded BYOND {}.{} installer",
                major, minor
            ),
            installer_path: installer_path.to_string_lossy().to_string(),
        }),
        Err(primary_error) => {
            println!("Failed to download from primary URL: {}", primary_error);

            // Try backup URL
            let backup_url = format!(
                "https://spacestation13.github.io/byond-builds/{}/{}.{}_byond.exe",
                major, major, minor
            ); // TODO: Replace with actual mirror

            match download_file(&backup_url, &installer_path, &client).await {
                Ok(_) => Ok(DownloadResult {
                    success: true,
                    message: format!(
                        "Successfully downloaded BYOND {}.{} installer from backup source",
                        major, minor
                    ),
                    installer_path: installer_path.to_string_lossy().to_string(),
                }),
                Err(backup_error) => Err(format!(
                    "Failed to download BYOND installer from both sources. Primary error: {}, Backup error: {}",
                    primary_error, backup_error
                )),
            }
        }
    }
}

/// Download a file from a URL to a specified path
async fn download_file(url: &str, path: &Path, client: &reqwest::Client) -> Result<(), String> {
    // Make the HTTP request
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download file: HTTP status {}",
            response.status()
        ));
    }

    // Get the response bytes
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to get response bytes: {}", e))?;

    // Write to file
    let mut file = File::create(path).map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

/// Install BYOND from a downloaded installer
#[tauri::command]
pub fn install_byond(installer_path: &str) -> Result<InstallResult, String> {
    let path = Path::new(installer_path);

    if !path.exists() {
        return Err(format!("Installer not found at {}", path.display()));
    }

    // Run the installer
    let output = Command::new(path)
        .output()
        .map_err(|e| format!("Failed to execute installer: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Installer exited with failure status {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(InstallResult {
        success: true,
        message: "BYOND installed successfully".to_string(),
    })
}
