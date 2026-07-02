$ErrorActionPreference = "Stop"

# Get project root
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ROOT_DIR = (Get-Item $PSScriptRoot).Parent.FullName

$HOSTS_PATH = "$env:SystemRoot\System32\drivers\etc\hosts"
$DOMAINS = @("mypte.pearsonpte.com", "id.mypte.pearsonpte.com")
$HOSTS_LINE = "127.0.0.1 mypte.pearsonpte.com id.mypte.pearsonpte.com"

# Detect Nginx
$NGINX_PATH = (Get-Command nginx.exe -ErrorAction SilentlyContinue).Source
if ($NGINX_PATH) {
    $NGINX_DIR = Split-Path $NGINX_PATH -Parent
} else {
    $nginxProcess = Get-Process nginx -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($nginxProcess) {
        $NGINX_DIR = Split-Path $nginxProcess.Path -Parent
    } else {
        $NGINX_DIR = "C:\nginx"
    }
}

$MODE = if ($args.Count -gt 0) { $args[0] } else { "enable" }

function Check-Admin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "ERROR: Please run this script as an Administrator (Right-click -> Run with PowerShell)." -ForegroundColor Red
        exit 1
    }
}

function Add-Hosts {
    Write-Host "Updating hosts file..."
    $content = Get-Content $HOSTS_PATH
    $domainRegex = "mypte\.pearsonpte\.com|id\.mypte\.pearsonpte\.com"

    $found = $false
    $newContent = $content | ForEach-Object {
        if ($_ -match $domainRegex) {
            $found = $true
            $_ -replace "^#\s*", ""
        } else {
            $_
        }
    }

    if (-not $found) {
        $newContent += "`n$HOSTS_LINE"
    }

    $newContent | Set-Content $HOSTS_PATH
}

function Remove-Hosts {
    Write-Host "Disabling local domains in hosts file..."
    $content = Get-Content $HOSTS_PATH
    $domainRegex = "mypte\.pearsonpte\.com|id\.mypte\.pearsonpte\.com"

    $newContent = $content | ForEach-Object {
        if ($_ -match $domainRegex -and $_ -notmatch "^#") {
            "# " + $_
        } else {
            $_
        }
    }

    $newContent | Set-Content $HOSTS_PATH
}

function Generate-Certs {
    $SSL_DIR = Join-Path $NGINX_DIR "conf\ssl"
    if (-not (Test-Path $SSL_DIR)) { New-Item -ItemType Directory -Path $SSL_DIR -Force | Out-Null }

    $CERT_FILE = Join-Path $SSL_DIR "mypte-local.crt"
    $KEY_FILE = Join-Path $SSL_DIR "mypte-local.key"

    if (Get-Command mkcert -ErrorAction SilentlyContinue) {
        Write-Host "Using mkcert to generate certificates..."
        & mkcert -install
        & mkcert -cert-file $CERT_FILE -key-file $KEY_FILE mypte.pearsonpte.com id.mypte.pearsonpte.com
    } elseif (Get-Command openssl -ErrorAction SilentlyContinue) {
        Write-Host "Using openssl to generate certificates..."
        & openssl req -x509 -nodes -newkey rsa:2048 -days 825 `
            -keyout $KEY_FILE -out $CERT_FILE `
            -subj "/CN=mypte.pearsonpte.com" `
            -addext "subjectAltName=DNS:mypte.pearsonpte.com,DNS:id.mypte.pearsonpte.com"
    } else {
        Write-Host "WARNING: Neither mkcert nor openssl found. Skipping certificate generation." -ForegroundColor Yellow
    }
}

function Enable {
    Check-Admin
    Add-Hosts

    if (-not (Test-Path $NGINX_DIR)) {
        Write-Host "WARNING: Nginx not detected at $NGINX_DIR. Skipping Nginx config." -ForegroundColor Yellow
        Write-Host "You may need to manually configure your Nginx server."
        return
    }

    Generate-Certs

    $SOURCE_CONF = Join-Path $ROOT_DIR "nginx\id-mypte-local.conf"
    $TARGET_CONF = Join-Path $NGINX_DIR "conf\pearson-dashboard-local.conf"

    if (Test-Path $SOURCE_CONF) {
        $conf = Get-Content $SOURCE_CONF
        $conf = $conf -replace "/etc/nginx/ssl/", "conf/ssl/"
        $conf | Set-Content $TARGET_CONF
        Write-Host "Nginx config created at $TARGET_CONF"
        Write-Host "Make sure to add 'include pearson-dashboard-local.conf;' to your nginx.conf server block or http block." -ForegroundColor Green
    }

    $nginxExe = Join-Path $NGINX_DIR "nginx.exe"
    if (Test-Path $nginxExe) {
        if (Get-Process nginx -ErrorAction SilentlyContinue) {
            Write-Host "Reloading Nginx..."
            Start-Process $nginxExe -ArgumentList "-s reload" -WorkingDirectory $NGINX_DIR -Wait
        } else {
            Write-Host "Starting Nginx..."
            Start-Process $nginxExe -WorkingDirectory $NGINX_DIR
        }
    }
}

function Disable {
    Check-Admin
    Remove-Hosts

    $TARGET_CONF = Join-Path $NGINX_DIR "conf\pearson-dashboard-local.conf"
    if (Test-Path $TARGET_CONF) {
        Rename-Item $TARGET_CONF "pearson-dashboard-local.conf.disabled" -Force
        Write-Host "Nginx config disabled."
    }

    $nginxExe = Join-Path $NGINX_DIR "nginx.exe"
    if (Test-Path $nginxExe -and (Get-Process nginx -ErrorAction SilentlyContinue)) {
        Start-Process $nginxExe -ArgumentList "-s reload" -WorkingDirectory $NGINX_DIR -Wait
    }
}

switch ($MODE) {
    "enable" { Enable }
    "disable" { Disable }
    default { Write-Host "Usage: .\setup-local-domains.ps1 [enable|disable]" }
}
