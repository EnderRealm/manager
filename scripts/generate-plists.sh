#!/bin/bash
set -euo pipefail

HOME_DIR="$HOME"
SERVICE_DIR="$HOME_DIR/.local/services/manager"
CADDY_DIR="$HOME_DIR/.local/services/caddy"
CADDY_BIN="$CADDY_DIR/caddy"
CADDY_ENV="$CADDY_DIR/.env"
LAUNCH_DIR="$HOME_DIR/Library/LaunchAgents"
LOG_DIR="$HOME_DIR/Library/Logs/Manager"
BUN_PATH="/opt/homebrew/bin/bun"
DEPLOYER_PATH="$SERVICE_DIR/scripts/deployer.sh"

ACTION="${1:-}"

generate_server_plist() {
    cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.manager.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>$BUN_PATH</string>
        <string>run</string>
        <string>src/server/index.ts</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$SERVICE_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>3100</string>
        <key>CONFIG_PATH</key>
        <string>$SERVICE_DIR/config.json</string>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/server.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/server.log</string>
</dict>
</plist>
PLIST
}

generate_deployer_plist() {
    cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.manager.deployer</string>
    <key>ProgramArguments</key>
    <array>
        <string>$DEPLOYER_PATH</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$SERVICE_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>300</integer>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/deployer.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/deployer.log</string>
</dict>
</plist>
PLIST
}

generate_caddy_plist() {
    cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.manager.caddy</string>
    <key>ProgramArguments</key>
    <array>
        <string>$CADDY_BIN</string>
        <string>run</string>
        <string>--config</string>
        <string>$CADDY_DIR/Caddyfile</string>
        <string>--envfile</string>
        <string>$CADDY_ENV</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$CADDY_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>XDG_DATA_HOME</key>
        <string>$CADDY_DIR/data</string>
        <key>XDG_CONFIG_HOME</key>
        <string>$CADDY_DIR/config</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/caddy.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/caddy.log</string>
</dict>
</plist>
PLIST
}

install_plists() {
    mkdir -p "$LAUNCH_DIR" "$LOG_DIR"

    echo "Writing plist files..."
    generate_server_plist > "$LAUNCH_DIR/com.manager.server.plist"
    generate_deployer_plist > "$LAUNCH_DIR/com.manager.deployer.plist"
    generate_caddy_plist > "$LAUNCH_DIR/com.manager.caddy.plist"

    echo "Loading services..."
    local uid
    uid=$(id -u)

    for label in com.manager.server com.manager.deployer com.manager.caddy; do
        # Unload first if already loaded (ignore errors)
        launchctl bootout "gui/$uid/$label" 2>/dev/null || true
        launchctl bootstrap "gui/$uid" "$LAUNCH_DIR/$label.plist"
        echo "  Loaded $label"
    done

    echo ""
    echo "All services installed and loaded."
    echo "Check status: launchctl list | grep com.manager"
}

uninstall_plists() {
    local uid
    uid=$(id -u)

    echo "Unloading services..."
    for label in com.manager.server com.manager.deployer com.manager.caddy; do
        launchctl bootout "gui/$uid/$label" 2>/dev/null && echo "  Unloaded $label" || echo "  $label was not loaded"
        rm -f "$LAUNCH_DIR/$label.plist"
    done

    echo "Plist files removed."
}

case "$ACTION" in
    --install)
        install_plists
        ;;
    --uninstall)
        uninstall_plists
        ;;
    "")
        echo "=== com.manager.server.plist ==="
        generate_server_plist
        echo ""
        echo "=== com.manager.deployer.plist ==="
        generate_deployer_plist
        echo ""
        echo "=== com.manager.caddy.plist ==="
        generate_caddy_plist
        ;;
    *)
        echo "Usage: $(basename "$0") [--install|--uninstall]"
        echo "  No args: print plists to stdout"
        echo "  --install: write plists and load into launchctl"
        echo "  --uninstall: unload from launchctl and remove plists"
        exit 1
        ;;
esac
