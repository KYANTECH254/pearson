param(
  [ValidateSet("enable", "disable", "status")]
  [string]$Mode = "enable",
  [string]$NginxDir = "",
  [string]$UpstreamUrl = "https://pearson-d.my.to"
)

$ErrorActionPreference = "Stop"

$HostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$LocalDomains = @("mypte.pearsonpte.com", "id.mypte.pearsonpte.com")
$HostsStart = "# Pearson dashboard local proxy start"
$HostsEnd = "# Pearson dashboard local proxy end"
$HostsLine = "127.0.0.1 $($LocalDomains -join ' ')"
$DomainRegex = "mypte\.pearsonpte\.com|id\.mypte\.pearsonpte\.com"

function Test-Admin {
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Require-Admin {
  if (-not (Test-Admin)) {
    Write-Host "Run this script as Administrator." -ForegroundColor Red
    exit 1
  }
}

function Resolve-NginxDir {
  if ($NginxDir) {
    return (Resolve-Path $NginxDir).Path
  }

  $nginxCommand = Get-Command nginx.exe -ErrorAction SilentlyContinue
  if ($nginxCommand) {
    return (Split-Path $nginxCommand.Source -Parent)
  }

  $nginxProcess = Get-Process nginx -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($nginxProcess -and $nginxProcess.Path) {
    return (Split-Path $nginxProcess.Path -Parent)
  }

  return "C:\nginx"
}

function Get-Upstream {
  $uri = [Uri]$UpstreamUrl
  if ($uri.Scheme -ne "https" -and $uri.Scheme -ne "http") {
    throw "UpstreamUrl must start with http:// or https://"
  }

  $port = ""
  if (-not $uri.IsDefaultPort) {
    $port = ":$($uri.Port)"
  }

  return @{
    Origin = "$($uri.Scheme)://$($uri.Host)$port"
    Host = $uri.Host
  }
}

function Remove-ExistingHostsBlock {
  $content = @(Get-Content $HostsPath -ErrorAction SilentlyContinue)
  $output = New-Object System.Collections.Generic.List[string]
  $insideBlock = $false

  foreach ($line in $content) {
    if ($line.Trim() -eq $HostsStart) {
      $insideBlock = $true
      continue
    }

    if ($line.Trim() -eq $HostsEnd) {
      $insideBlock = $false
      continue
    }

    if ($insideBlock) {
      continue
    }

    if ($line -match $DomainRegex) {
      continue
    }

    $output.Add($line)
  }

  return $output
}

function Enable-Hosts {
  Write-Host "Updating Windows hosts file..."
  Copy-Item $HostsPath "$HostsPath.bak" -Force
  $content = Remove-ExistingHostsBlock
  $content.Add($HostsStart)
  $content.Add($HostsLine)
  $content.Add($HostsEnd)
  $content | Set-Content $HostsPath -Encoding ASCII
}

function Disable-Hosts {
  Write-Host "Removing local Pearson hosts entries..."
  Copy-Item $HostsPath "$HostsPath.bak" -Force
  $content = Remove-ExistingHostsBlock
  $content | Set-Content $HostsPath -Encoding ASCII
}

function Ensure-Mkcert {
  $mkcert = Get-Command mkcert.exe -ErrorAction SilentlyContinue
  if ($mkcert) {
    return $mkcert.Source
  }

  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    Write-Host "mkcert not found. Installing mkcert with winget..."
    & $winget.Source install --id FiloSottile.mkcert -e --source winget --accept-package-agreements --accept-source-agreements
    $mkcert = Get-Command mkcert.exe -ErrorAction SilentlyContinue
    if ($mkcert) {
      return $mkcert.Source
    }
  }

  throw "mkcert.exe is required. Install it, then rerun this script."
}

function Ensure-Certificates {
  param([string]$ResolvedNginxDir)

  $sslDir = Join-Path $ResolvedNginxDir "conf\ssl"
  New-Item -ItemType Directory -Path $sslDir -Force | Out-Null

  $certFile = Join-Path $sslDir "mypte-local.crt"
  $keyFile = Join-Path $sslDir "mypte-local.key"
  $mkcert = Ensure-Mkcert

  Write-Host "Installing/trusting mkcert local CA..."
  & $mkcert -install

  if (-not (Test-Path $certFile) -or -not (Test-Path $keyFile)) {
    Write-Host "Creating local HTTPS certificate..."
    & $mkcert -cert-file $certFile -key-file $keyFile @LocalDomains
  }

  return @{
    Cert = ($certFile -replace "\\", "/")
    Key = ($keyFile -replace "\\", "/")
  }
}

function Ensure-NginxInclude {
  param([string]$ResolvedNginxDir)

  $nginxConf = Join-Path $ResolvedNginxDir "conf\nginx.conf"
  if (-not (Test-Path $nginxConf)) {
    throw "Could not find $nginxConf"
  }

  $content = Get-Content $nginxConf -Raw
  if ($content -match "conf/conf\.d/\*\.conf") {
    return
  }

  Write-Host "Adding conf.d include to nginx.conf..."
  $lastBrace = $content.LastIndexOf("}")
  if ($lastBrace -lt 0) {
    throw "Could not update nginx.conf automatically."
  }

  $include = "`r`n    include conf/conf.d/*.conf;`r`n"
  $updated = $content.Insert($lastBrace, $include)
  Set-Content $nginxConf $updated -Encoding ASCII
}

function Write-NginxProxyConfig {
  param(
    [string]$ResolvedNginxDir,
    [hashtable]$Upstream,
    [hashtable]$Certificates
  )

  $confDir = Join-Path $ResolvedNginxDir "conf\conf.d"
  New-Item -ItemType Directory -Path $confDir -Force | Out-Null

  $targetConf = Join-Path $confDir "pearson-dashboard-local-proxy.conf"
  $template = @'
server {
    listen 80;
    server_name mypte.pearsonpte.com id.mypte.pearsonpte.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name mypte.pearsonpte.com id.mypte.pearsonpte.com;

    ssl_certificate __CERT_FILE__;
    ssl_certificate_key __KEY_FILE__;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass __UPSTREAM_ORIGIN__;
        proxy_ssl_server_name on;
        proxy_ssl_name __UPSTREAM_HOST__;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_redirect __UPSTREAM_ORIGIN__/ https://$host/;
        proxy_cookie_domain __UPSTREAM_HOST__ $host;
    }
}
'@

  $config = $template.
    Replace("__CERT_FILE__", $Certificates.Cert).
    Replace("__KEY_FILE__", $Certificates.Key).
    Replace("__UPSTREAM_ORIGIN__", $Upstream.Origin).
    Replace("__UPSTREAM_HOST__", $Upstream.Host)

  $config | Set-Content $targetConf -Encoding ASCII
  return $targetConf
}

function Reload-Nginx {
  param([string]$ResolvedNginxDir)

  $nginxExe = Join-Path $ResolvedNginxDir "nginx.exe"
  if (-not (Test-Path $nginxExe)) {
    throw "Could not find nginx.exe at $nginxExe"
  }

  Push-Location $ResolvedNginxDir
  try {
    & $nginxExe -t
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }

    if (Get-Process nginx -ErrorAction SilentlyContinue) {
      Write-Host "Reloading nginx..."
      & $nginxExe -s reload
    } else {
      Write-Host "Starting nginx..."
      Start-Process $nginxExe -WorkingDirectory $ResolvedNginxDir
    }
  } finally {
    Pop-Location
  }
}

function Disable-NginxProxy {
  param([string]$ResolvedNginxDir)

  $targetConf = Join-Path $ResolvedNginxDir "conf\conf.d\pearson-dashboard-local-proxy.conf"
  $disabledConf = "$targetConf.disabled"

  if (Test-Path $targetConf) {
    Move-Item $targetConf $disabledConf -Force
    Write-Host "Disabled nginx proxy config."
  }

  if (Test-Path (Join-Path $ResolvedNginxDir "nginx.exe")) {
    Reload-Nginx $ResolvedNginxDir
  }
}

function Show-Status {
  $upstream = Get-Upstream
  Write-Host "Local domains:"
  $LocalDomains | ForEach-Object { Write-Host "  https://$_" }
  Write-Host "Upstream:"
  Write-Host "  $($upstream.Origin)"
  Write-Host ""
  Write-Host "DNS check:"
  Resolve-DnsName $LocalDomains[0] -ErrorAction SilentlyContinue | Format-Table -AutoSize
}

function Enable {
  Require-Admin
  $resolvedNginxDir = Resolve-NginxDir
  if (-not (Test-Path $resolvedNginxDir)) {
    throw "Nginx directory not found: $resolvedNginxDir. Install nginx for Windows or pass its directory as the second argument."
  }

  $upstream = Get-Upstream
  Enable-Hosts
  $certificates = Ensure-Certificates $resolvedNginxDir
  Ensure-NginxInclude $resolvedNginxDir
  $configPath = Write-NginxProxyConfig $resolvedNginxDir $upstream $certificates
  Reload-Nginx $resolvedNginxDir
  ipconfig /flushdns | Out-Null

  Write-Host ""
  Write-Host "Local proxy enabled:"
  Write-Host "  https://mypte.pearsonpte.com"
  Write-Host "  https://id.mypte.pearsonpte.com/Account/Login"
  Write-Host "Proxy config:"
  Write-Host "  $configPath"
}

function Disable {
  Require-Admin
  $resolvedNginxDir = Resolve-NginxDir
  Disable-Hosts
  if (Test-Path $resolvedNginxDir) {
    Disable-NginxProxy $resolvedNginxDir
  }
  ipconfig /flushdns | Out-Null
  Write-Host "Local proxy disabled."
}

switch ($Mode) {
  "enable" { Enable }
  "disable" { Disable }
  "status" { Show-Status }
}
