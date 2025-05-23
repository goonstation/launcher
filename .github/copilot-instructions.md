# Goonstation Launcher - GitHub Copilot Context

## Project Overview

Goonstation Launcher is a Windows Rust application that displays server status information for goonhub.com servers. The application provides a simple interface for checking server status and eventually launching the game to connect to selected servers.

1. **GUI Interface**

   - Servers status display, including:
     - Server name
     - Player count
     - Server status (online/offline)
   - Join Server buttons
   - Exit button
   - Background music with mute/unmute functionality

2. **HTTP Request Handling**
   - Background threads for network operations
   - Refresh happening in the background every 10 seconds
   - Error handling for connection issues
   - Caching server status information, using it if needed
