Write-Host "=== License & SBOM Scanner - Build & Package ==="
Write-Host ""

function Step-Version {
    $manifestRaw = Get-Content "vss-extension.json" -Raw
    $manifest = $manifestRaw | ConvertFrom-Json
    $parts = $manifest.version -split '\.'
    [int]$major = $parts[0]; [int]$minor = $parts[1]; [int]$patch = $parts[2]
    $oldVersion = $manifest.version

    $patch++
    if ($patch -ge 10) { $patch = 0; $minor++ }
    if ($minor -ge 10) { $minor = 0; $major++ }
    $newVersion = "$major.$minor.$patch"

    $manifestRaw -replace [regex]::Escape("`"version`": `"$oldVersion`""), "`"version`": `"$newVersion`"" |
        Set-Content "vss-extension.json" -NoNewline
    $pkgRaw = Get-Content "package.json" -Raw
    $pkgVersion = ($pkgRaw | ConvertFrom-Json).version
    $pkgRaw -replace [regex]::Escape("`"version`": `"$pkgVersion`""), "`"version`": `"$newVersion`"" |
        Set-Content "package.json" -NoNewline

    Write-Host "  Version: $oldVersion -> $newVersion" -ForegroundColor Green
    return $newVersion
}

# Step 1: Install dependencies
Write-Host "[1/5] Installing dependencies..."
npm install --legacy-peer-deps --silent
Write-Host "  Done."

# Step 2: Run tests
Write-Host "[2/5] Running tests..."
npm test
Write-Host "  All tests passed."

# Step 3: Increment version
Write-Host "[3/5] Incrementing version..."
$version = Step-Version

# Step 4: Production build
Write-Host "[4/5] Building for production..."
npm run build
Write-Host "  Build complete. Output in dist/"

# Step 5: Package .vsix
Write-Host "[5/5] Packaging .vsix..."
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
