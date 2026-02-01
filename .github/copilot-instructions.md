# Goonstation Launcher

Goonstation Launcher is a Tauri application that displays server status
information for Goonstation Space Station 13 servers. There's a simple interface
for checking server status and launching the game to connect to a server.

- Server status display, including:
  - Server name
  - Player count
  - Server status (online/offline)
- Join Server buttons
- Exit button
- Background music with mute/unmute functionality

Strive for simple, clean, and efficient code.

For comments, only use inline jsdoc comments (in typescript) or rustdoc comments (in rust).

Don't rerun the `deno task tauri dev` every time, I'm running it in the background.
Do not use npm to install/uninstall. We use deno for package management.
Installation is done via `deno install npm:@tauri-apps/plugin-shell`

We are only targeting webview2 and webkit, since this is made with Tauri.
Don't give a bunch of summary of changes.

Be terse with comments, don't add unnecessary ones if it's obvious what the code
does. No useless comments describing the change you just made.
