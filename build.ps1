Write-Host "=== License & SBOM Scanner - Build & Package ==="
Write-Host ""

# Step 1: Install dependencies
Write-Host "[1/4] Installing dependencies..."
npm install --legacy-peer-deps --silent
Write-Host "  Done."

# Step 2: Run tests
Write-Host "[2/4] Running tests..."
npm test
Write-Host "  All tests passed."

# Step 3: Production build
Write-Host "[3/4] Building for production..."
npm run build
Write-Host "  Build complete. Output in dist/"

# Step 4: Package .vsix
Write-Host "[4/4] Packaging .vsix..."
npm run package
Write-Host ""
Write-Host "=== Build complete ==="
Write-Host ""

# Show the output file
$vsix = Get-ChildItem -Path "out" -Filter "*.vsix" | Select-Object -First 1
if ($vsix) {
    $size = [math]::Round(($vsix.Length / 1MB), 2)
    Write-Host "Package: $($vsix.FullName) ($size MB)"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Upload $($vsix.FullName) to https://marketplace.visualstudio.com/manage"
} else {
    Write-Host "Warning: No .vsix file found in out/"
    exit 1
}
