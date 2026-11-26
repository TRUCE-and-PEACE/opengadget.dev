$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$WEBI_PKG = {{WEBI_PKG}}
$WEBI_VERSION = {{WEBI_VERSION}}
$WEBI_TAG = {{WEBI_TAG}}
$WEBI_PKG_URL = {{WEBI_PKG_URL}}
$WEBI_HOST = {{WEBI_HOST}}

$WEBI_OPT_DIR = Join-Path $HOME ".local\opt\$WEBI_PKG-$WEBI_TAG"
$WEBI_BIN_DIR = Join-Path $HOME ".local\bin"
$WEBI_ENV_DIR = Join-Path $HOME ".config\envman"
$WEBI_TMP_DIR = Join-Path ([System.IO.Path]::GetTempPath()) ("webi-$WEBI_PKG-" + [Guid]::NewGuid().ToString('N'))
$WEBI_ARCHIVE = Join-Path $WEBI_TMP_DIR "pkg.zip"
$WEBI_EXTRACT_DIR = Join-Path $WEBI_TMP_DIR "extract"

function Webi-Download {
  New-Item -ItemType Directory -Force -Path $WEBI_TMP_DIR, $WEBI_BIN_DIR | Out-Null
  Write-Host "Downloading $WEBI_PKG ($WEBI_TAG)..."
  Invoke-WebRequest -Uri $WEBI_PKG_URL -OutFile $WEBI_ARCHIVE -Headers @{ 'User-Agent' = 'opengadget.dev/1.0' } -UseBasicParsing
}

function Webi-Extract {
  New-Item -ItemType Directory -Force -Path $WEBI_EXTRACT_DIR | Out-Null
  Expand-Archive -Path $WEBI_ARCHIVE -DestinationPath $WEBI_EXTRACT_DIR -Force
}

function Webi-PathAdd {
  New-Item -ItemType Directory -Force -Path $WEBI_ENV_DIR | Out-Null
  $envFile = Join-Path $WEBI_ENV_DIR "PATH.env"
  if (-not (Test-Path $envFile)) {
    Set-Content -Path $envFile -Value 'export PATH="$HOME/.local/bin:$PATH"' -Encoding UTF8
  }
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $parts = if ($userPath) { $userPath -split ';' | Where-Object { $_ -ne '' } } else { @() }
  if ($parts -notcontains $WEBI_BIN_DIR) {
    $newPath = ($parts + $WEBI_BIN_DIR) -join ';'
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
  }
  if (($env:Path -split ';') -notcontains $WEBI_BIN_DIR) {
    $env:Path = "$WEBI_BIN_DIR;$env:Path"
  }
}

function Pkg-Install {
  Webi-Extract
  if (Test-Path $WEBI_OPT_DIR) { Remove-Item -Recurse -Force $WEBI_OPT_DIR }
  New-Item -ItemType Directory -Force -Path $WEBI_OPT_DIR | Out-Null
  Copy-Item -Path (Join-Path $WEBI_EXTRACT_DIR '*') -Destination $WEBI_OPT_DIR -Recurse -Force
}

function Pkg-PostInstall {
  Webi-PathAdd
  Write-Host "Installed $WEBI_PKG $WEBI_TAG to $WEBI_BIN_DIR"
}

{{PKG_INSTALL_SCRIPT}}

try {
  Webi-Download
  Pkg-Install
  Pkg-PostInstall
} finally {
  if (Test-Path $WEBI_TMP_DIR) {
    Remove-Item -Recurse -Force $WEBI_TMP_DIR -ErrorAction SilentlyContinue
  }
}

