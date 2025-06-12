# Goonstation Launcher

A Windows application for checking the Goonstation Space Station 13 server
statuses and launching the game.

## Features

- Server status display (name, player count, online/offline status)
- Quick-join buttons (multiple launch options)
- Recomended BYOND version installer
- Background music with mute/unmute
- Auto-updater

## Development

### Prerequisites

- [Deno](https://deno.com/) v2.x
- [Rust](https://www.rust-lang.org/) stable
- [Node.js](https://nodejs.org/) LTS

### Quick Start

```bash
deno install

# Development
deno task tauri dev

# Build
deno task tauri build
```

### Code Quality

```bash
deno fmt --check
deno lint
src-tauri> cargo fmt
```

## Releasing

Update the versions in:

- package.json
- cargo.toml

push to release branch
