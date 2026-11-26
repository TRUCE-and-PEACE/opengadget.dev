function Pkg-Install {
  Webi-Extract
  if (Test-Path $WEBI_OPT_DIR) { Remove-Item -Recurse -Force $WEBI_OPT_DIR }
  New-Item -ItemType Directory -Force -Path $WEBI_OPT_DIR | Out-Null
  Copy-Item -Path (Join-Path $WEBI_EXTRACT_DIR '*') -Destination $WEBI_OPT_DIR -Recurse -Force

  $srcExe = Join-Path $WEBI_OPT_DIR "mytool.exe"
  $dstExe = Join-Path $WEBI_BIN_DIR "mytool.exe"
  if (Test-Path $srcExe) {
    Copy-Item -Path $srcExe -Destination $dstExe -Force
  }
}

function Pkg-PostInstall {
  Webi-PathAdd
  Write-Host "Installed $WEBI_PKG $WEBI_TAG to $WEBI_BIN_DIR"
}

