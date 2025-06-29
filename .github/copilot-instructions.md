# Goonstation Launcher

Goonstation Launcher is a Tauri application that displays server status
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

Strive for simple, clean, and efficient code.

Be terse with comments, don't add unnecessary ones if it's obvious what the code does.
Don't add dumb useless comments describing the change you just made, as well. Only use inline jsdoc comments where necessary.

Don't rerun the `deno task tauri dev` every time, I'm running it in the Do not
use npm to install/uninstall. We use deno for package management. We install
using deno, for example `deno install npm:@tauri-apps/plugin-shell`

We are only targeting webview2 and webkit, since this is made with Tauri.
Don't give a bunch of summary of changes.
