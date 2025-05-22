# Goonstation Launcher - GitHub Copilot Context

## Project Overview

Goonstation Launcher is a Windows Rust application that displays server status information for goonhub.com servers. The application provides a simple interface for checking server status and eventually launching the game to connect to selected servers.

## Core Functionality

1. **GUI Interface**

   - Servers status display, including:
     - Server name
     - Player count
     - Server status (online/offline)
   - Join Server buttons (placeholder for future game-launching functionality)
   - Exit button
   - Background music with mute/unmute functionality

2. **HTTP Request Handling**

   - Background threads for network operations
   - Refresh happening in the background every 10 seconds
   - Error handling for connection issues
   - Caching server status information, using it if needed

3. **Server Status Display**

   - Server name
   - HTML response parsing (simplified)
   - Status information presentation

4. **Architecture Considerations**
   - Non-blocking UI during network requests
   - Thread-local storage for cross-thread communication
   - Proper resource cleanup

!!!!!DO NOT BUILD THE PROGRAM THEN RUN IT, CARGO RUN AUTOMATICALLY BUILDS THE PROGRAM!!!!!!
