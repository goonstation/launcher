# Goonstation Launcher

Goonstation Launcher is a Windows application that displays server status
information for Goonstation Space Station 13 servers. There's a simple interface
for checking server status and launching the game to connect to a server.

1. **GUI Interface**
   - Server status display, including:
     - Server name
     - Player count
     - Server status (online/offline)
   - Join Server buttons
   - Exit button
   - Background music with mute/unmute functionality

2. **HTTP Request Handling**
   - Background threads for network operations
   - Refresh happening in the background
   - Error handling for connection issues
   - Caching server status information, using it if needed
