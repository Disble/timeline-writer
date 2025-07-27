# Timeline Writer Plugin Installer
# This script copies the plugin files to an Obsidian vault

param(
    [Parameter(Mandatory=$true)]
    [string]$VaultPath,
    
    [string]$PluginName = "timeline-writer"
)

# Validate vault path
if (-not (Test-Path $VaultPath)) {
    Write-Error "Vault path does not exist: $VaultPath"
    exit 1
}

# Check if .obsidian folder exists
$obsidianPath = Join-Path $VaultPath ".obsidian"
if (-not (Test-Path $obsidianPath)) {
    Write-Error "Not a valid Obsidian vault (missing .obsidian folder): $VaultPath"
    exit 1
}

# Create plugins directory if it doesn't exist
$pluginsPath = Join-Path $obsidianPath "plugins"
if (-not (Test-Path $pluginsPath)) {
    New-Item -ItemType Directory -Path $pluginsPath -Force
    Write-Host "Created plugins directory: $pluginsPath"
}

# Create plugin directory
$pluginPath = Join-Path $pluginsPath $PluginName
if (Test-Path $pluginPath) {
    Write-Host "Plugin directory already exists. Removing old files..."
    Remove-Item $pluginPath -Recurse -Force
}

New-Item -ItemType Directory -Path $pluginPath -Force
Write-Host "Created plugin directory: $pluginPath"

# Copy plugin files from dist directory
$distPath = "dist"
if (-not (Test-Path $distPath)) {
    Write-Error "Dist directory not found. Please run 'npm run build' first."
    exit 1
}

$filesToCopy = @("main.js", "manifest.json")
foreach ($file in $filesToCopy) {
    $sourceFile = Join-Path $distPath $file
    if (Test-Path $sourceFile) {
        Copy-Item $sourceFile $pluginPath
        Write-Host "Copied $file to plugin directory"
    } else {
        Write-Warning "File not found: $sourceFile"
    }
}

Write-Host ""
Write-Host "Plugin installation complete!"
Write-Host "Next steps:"
Write-Host "1. Restart Obsidian or reload the vault"
Write-Host "2. Go to Settings - Community plugins"
Write-Host "3. Enable Timeline Writer plugin"
Write-Host "4. Look for the clock icon in the ribbon toolbar" 
