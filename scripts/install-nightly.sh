#!/bin/bash
set -euo pipefail

HOME_DIR="$HOME"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LAUNCH_DIR="$HOME_DIR/Library/LaunchAgents"
LOG_DIR="$HOME_DIR/Library/Logs/Manager"
SESSION_LABEL="com.manager.session-pipeline"
ANALYSIS_LABEL="com.manager.analysis-pipeline"
OLD_LABEL="com.smacbeth.learnings-nightly"

ACTION="${1:-}"

generate_session_plist() {
    cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$SESSION_LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/bash</string>
        <string>$REPO_DIR/scripts/session-pipeline.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$REPO_DIR</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>$HOME_DIR</string>
        <key>PATH</key>
        <string>$HOME_DIR/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/session-pipeline.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/session-pipeline.log</string>
</dict>
</plist>
PLIST
}

generate_analysis_plist() {
    cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$ANALYSIS_LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/bash</string>
        <string>$REPO_DIR/scripts/analysis-pipeline.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$REPO_DIR</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>3</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>$HOME_DIR</string>
        <key>PATH</key>
        <string>$HOME_DIR/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/analysis-pipeline.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/analysis-pipeline.log</string>
</dict>
</plist>
PLIST
}

check_prerequisites() {
    local warnings=0
    if ! command -v claude &>/dev/null; then
        echo "  Warning: 'claude' not found in PATH"
        warnings=$((warnings + 1))
    fi
    if ! command -v tk &>/dev/null; then
        echo "  Warning: 'tk' not found in PATH"
        warnings=$((warnings + 1))
    fi
    if [ ! -d "$HOME_DIR/code/learnings" ]; then
        echo "  Warning: ~/code/learnings not found (set LEARNINGS_REPO to override)"
        warnings=$((warnings + 1))
    fi
    return $warnings
}

check_old_label() {
    local uid
    uid=$(id -u)
    if launchctl print "gui/$uid/$OLD_LABEL" &>/dev/null; then
        echo "  Warning: old label '$OLD_LABEL' is still loaded."
        echo "  Run: launchctl bootout gui/$uid/$OLD_LABEL"
    fi
}

load_service() {
    local label="$1"
    local uid
    uid=$(id -u)
    launchctl bootout "gui/$uid/$label" 2>/dev/null || true
    launchctl bootstrap "gui/$uid" "$LAUNCH_DIR/$label.plist"
    echo "  Loaded $label"
}

unload_service() {
    local label="$1"
    local uid
    uid=$(id -u)
    launchctl bootout "gui/$uid/$label" 2>/dev/null && echo "  Unloaded $label" || echo "  $label was not loaded"
    rm -f "$LAUNCH_DIR/$label.plist"
}

install_sessions() {
    echo "Checking prerequisites..."
    check_prerequisites || true
    check_old_label

    mkdir -p "$LAUNCH_DIR" "$LOG_DIR"

    echo "Writing session pipeline plist..."
    generate_session_plist > "$LAUNCH_DIR/$SESSION_LABEL.plist"

    echo "Loading service..."
    load_service "$SESSION_LABEL"

    echo ""
    echo "Session pipeline installed. Runs at 2 AM."
    echo "Logs: $LOG_DIR/session-pipeline.log"
}

install_all() {
    echo "Checking prerequisites..."
    check_prerequisites || true
    check_old_label

    mkdir -p "$LAUNCH_DIR" "$LOG_DIR"

    echo "Writing plists..."
    generate_session_plist > "$LAUNCH_DIR/$SESSION_LABEL.plist"
    generate_analysis_plist > "$LAUNCH_DIR/$ANALYSIS_LABEL.plist"

    echo "Loading services..."
    load_service "$SESSION_LABEL"
    load_service "$ANALYSIS_LABEL"

    echo ""
    echo "Both pipelines installed."
    echo "  Session pipeline:  2 AM  -> $LOG_DIR/session-pipeline.log"
    echo "  Analysis pipeline: 3 AM  -> $LOG_DIR/analysis-pipeline.log"
}

uninstall() {
    echo "Unloading services..."
    unload_service "$SESSION_LABEL"
    unload_service "$ANALYSIS_LABEL"
    echo "Plists removed."
}

list_status() {
    local uid
    uid=$(id -u)

    local G=$'\033[32m' R=$'\033[31m' Y=$'\033[33m' D=$'\033[2m' B=$'\033[1m' N=$'\033[0m'

    for label in "$SESSION_LABEL" "$ANALYSIS_LABEL"; do
        local plist="$LAUNCH_DIR/$label.plist"
        local installed=false loaded=false exit_info=""

        [[ -f "$plist" ]] && installed=true

        if launchctl print "gui/$uid/$label" &>/dev/null; then
            loaded=true
            exit_info="$(launchctl print "gui/$uid/$label" 2>/dev/null | grep 'last exit code' | sed 's/.*= //')" || true
        fi

        # Status icon
        local icon
        if $loaded; then
            icon="${G}●${N}"
        elif $installed; then
            icon="${Y}○${N}"
        else
            icon="${D}·${N}"
        fi

        # Short name
        local short="${label#com.manager.}"
        printf "  ${icon} ${B}%-20s${N}" "$short"

        if $loaded; then
            printf " ${G}loaded${N}"
        elif $installed; then
            printf " ${Y}installed but not loaded${N}"
        else
            printf " ${D}not installed${N}"
        fi
        echo ""

        if [[ -n "$exit_info" ]]; then
            printf "    ${D}last run: %s${N}\n" "$exit_info"
        fi

        if $installed; then
            local log_file
            log_file="$(grep -A1 'StandardOutPath' "$plist" 2>/dev/null | grep '<string>' | sed 's/.*<string>//;s/<\/string>.*//')" || true
            if [[ -n "$log_file" ]]; then
                printf "    ${D}log: %s${N}\n" "$log_file"
            fi
        fi
    done

    # Check for legacy label
    if launchctl print "gui/$uid/$OLD_LABEL" &>/dev/null; then
        echo ""
        printf "  ${R}●${N} ${B}%-20s${N} ${R}legacy — should be removed${N}\n" "$OLD_LABEL"
        printf "    run: launchctl bootout gui/$uid/$OLD_LABEL\n"
    fi
}

case "$ACTION" in
    --install)
        install_all
        ;;
    --install-sessions)
        install_sessions
        ;;
    --uninstall)
        uninstall
        ;;
    --list)
        list_status
        ;;
    "")
        echo "=== $SESSION_LABEL.plist (all machines) ==="
        generate_session_plist
        echo ""
        echo "=== $ANALYSIS_LABEL.plist (Mac Studio only) ==="
        generate_analysis_plist
        echo ""
        echo "Prerequisites:"
        check_prerequisites || true
        check_old_label
        ;;
    *)
        echo "Usage: $(basename "$0") [--install|--install-sessions|--uninstall|--list]"
        echo "  No args:            print plists to stdout"
        echo "  --install:          install both pipelines (Mac Studio)"
        echo "  --install-sessions: install session pipeline only (laptop)"
        echo "  --uninstall:        unload and remove all pipelines"
        echo "  --list:             show installed pipelines and status"
        exit 1
        ;;
esac
