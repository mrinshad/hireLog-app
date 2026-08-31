#!/usr/bin/env bash
set -e

# HireLog Local Production APK Builder
# Builds a signed, installable standalone release APK locally without Expo/EAS cloud.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
OUTPUT_APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
TARGET_APK="$PROJECT_ROOT/hirelog-production.apk"

echo "=========================================="
echo "  HireLog: Building Production APK Locally"
echo "=========================================="
echo ""

cd "$ANDROID_DIR"

echo "📦 Compiling release APK with Gradle..."
./gradlew assembleRelease

if [ -f "$OUTPUT_APK" ]; then
    echo "📋 Copying APK to project root..."
    cp "$OUTPUT_APK" "$TARGET_APK"
    
    APK_SIZE=$(ls -lh "$TARGET_APK" | awk '{print $5}')
    echo ""
    echo "=========================================="
    echo "✅ Standalone Production APK Generated!"
    echo "📁 Output: $TARGET_APK"
    echo "📊 Size:   $APK_SIZE"
    echo "=========================================="
else
    echo "❌ Error: Release APK was not found at $OUTPUT_APK"
    exit 1
fi
