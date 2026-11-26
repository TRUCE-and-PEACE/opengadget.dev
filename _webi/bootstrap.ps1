$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$WEBI_HOST = {{WEBI_HOST}}
$WEBI_PKG = {{WEBI_PKG}}
$WEBI_VER = {{WEBI_VER}}

$arch = 'amd64'
try {
  $osArch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
  if ($osArch -eq 'arm64') { $arch = 'arm64' }
  elseif ($osArch -eq 'x86') { $arch = 'x86' }
} catch {
  if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { $arch = 'arm64' }
  elseif ($env:PROCESSOR_ARCHITECTURE -eq 'x86') { $arch = 'x86' }
}

$ua = "PowerShell/opengadget-bootstrap (os=windows; arch=$arch; formats=zip)"
$url = "$WEBI_HOST/api/installers/$WEBI_PKG@$WEBI_VER.ps1"

$script = Invoke-RestMethod -Uri $url -Headers @{ 'User-Agent' = $ua } -UseBasicParsing
& ([ScriptBlock]::Create($script))

