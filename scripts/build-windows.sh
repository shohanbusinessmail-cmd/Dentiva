#!/bin/bash
#
# build-windows.sh
#
# Build the production Windows executable for Dentiva.
# Run this on a Windows machine (or Linux with wine for cross-build) with normal internet access.
#
# Output:
#   release/Dentiva-Setup-1.0.0.exe      - NSIS installer
#   release/Dentiva-Portable-1.0.0.exe   - Standalone portable
#

set -e

echo "==================================="
echo "Dentiva Windows Build"
echo "==================================="

# Install dependencies
echo ""
echo "[1/4] Installing dependencies..."
npm install --no-audit --no-fund

# Build main process and renderer
echo ""
echo "[2/4] Building TypeScript and React..."
npm run build

# Verify build artifacts
echo ""
echo "[3/4] Verifying build artifacts..."
if [ ! -f dist/main/main.js ]; then
  echo "ERROR: dist/main/main.js missing"
  exit 1
fi
if [ ! -f dist/renderer/index.html ]; then
  echo "ERROR: dist/renderer/index.html missing"
  exit 1
fi
echo "  ✓ Main process: dist/main/main.js"
echo "  ✓ Renderer: dist/renderer/index.html"

# Build Windows packages
echo ""
echo "[4/4] Packaging Windows installer and portable..."
npm run dist

echo ""
echo "==================================="
echo "Build complete!"
echo "==================================="
echo ""
echo "Artifacts in release/:"
ls -lh release/*.exe 2>/dev/null || echo "  (No .exe files found)"
echo ""
echo "Distribute these files to your users."
echo "Run Dentiva-Setup-1.0.0.exe for normal installation."
echo "Use Dentiva-Portable-1.0.0.exe for portable / no-install use."