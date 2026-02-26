#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESOURCES_DIR="$PROJECT_ROOT/desktop/src-tauri/resources"

mkdir -p "$RESOURCES_DIR"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      x86_64) PLATFORM="darwin-x64" ;;
      arm64) PLATFORM="darwin-arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64) PLATFORM="linux-x64" ;;
      aarch64|arm64) PLATFORM="linux-arm64" ;;
      armv7l) PLATFORM="linux-armhf" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  MINGW*|MSYS*|CYGWIN*)
    PLATFORM="win32-x64"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

echo "Fetching FFmpeg for $PLATFORM..."

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
npm init -y > /dev/null 2>&1
npm install ffmpeg-static --save-dev > /dev/null 2>&1

if [ "$OS" = "MINGW" ] || [ "$OS" = "MSYS" ] || [ "$OS" = "CYGWIN" ] || [ "$PLATFORM" = "win32-x64" ]; then
  cp node_modules/ffmpeg-static/ffmpeg.exe "$RESOURCES_DIR/ffmpeg.exe"
else
  cp node_modules/ffmpeg-static/ffmpeg "$RESOURCES_DIR/ffmpeg"
  chmod +x "$RESOURCES_DIR/ffmpeg"
fi

rm -rf "$TEMP_DIR"
echo "FFmpeg installed to $RESOURCES_DIR"
