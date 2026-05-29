#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOSTS_LINE="127.0.0.1 mypte.pearsonpte.com id.mypte.pearsonpte.com"
HOSTS_LINE_IPV6="::1 mypte.pearsonpte.com id.mypte.pearsonpte.com"
HOSTS_PATTERN='mypte\.pearsonpte\.com\|id\.mypte\.pearsonpte\.com'
NGINX_TARGET="/etc/nginx/conf.d/pearson-dashboard-local.conf"
NGINX_DISABLED="/etc/nginx/conf.d/pearson-dashboard-local.conf.disabled"
CERT_DIR="/etc/nginx/ssl"
CERT_FILE="${CERT_DIR}/mypte-local.crt"
KEY_FILE="${CERT_DIR}/mypte-local.key"
MODE="${1:-enable}"

reload_nginx() {
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl reload nginx || sudo systemctl start nginx
  else
    sudo nginx -s reload || sudo nginx
  fi
}

comment_out_hosts() {
  sudo cp /etc/hosts /etc/hosts.bak || true
  sudo sed -i "/${HOSTS_PATTERN}/ s/^\([^#]\)/# \1/" /etc/hosts
}

add_hosts_entries() {
  # Keep a backup
  sudo cp /etc/hosts /etc/hosts.bak || true

  # If the domains are present but commented out, uncomment them.
  sudo sed -i "/mypte\\.pearsonpte\\.com/ s/^#\s*//" /etc/hosts || true
  sudo sed -i "/id\\.mypte\\.pearsonpte\\.com/ s/^#\s*//" /etc/hosts || true

  # Ensure a single active hosts mapping exists for the local domains. If
  # neither domain is present active, append the standard hosts line(s).
  if ! grep -Eq '(^|[[:space:]])mypte\.pearsonpte\.com([[:space:]]|$)' /etc/hosts && \
     ! grep -Eq '(^|[[:space:]])id\.mypte\.pearsonpte\.com([[:space:]]|$)' /etc/hosts; then
    echo "${HOSTS_LINE}" | sudo tee -a /etc/hosts >/dev/null
  fi

  # Also ensure IPv6 localhost mapping exists so clients that prefer IPv6
  # will resolve to the local host instead of remote AAAA records.
  if ! grep -Eq '(^|[[:space:]])::1([[:space:]]|$)' /etc/hosts || \
     ! grep -Eq '(^|[[:space:]])mypte\.pearsonpte\.com([[:space:]]|$)' /etc/hosts; then
    if ! grep -Eq '(^|[[:space:]])mypte\.pearsonpte\.com([[:space:]]|$)' /etc/hosts; then
      echo "${HOSTS_LINE_IPV6}" | sudo tee -a /etc/hosts >/dev/null
    else
      # If ::1 exists but doesn't include the domains, append only the domains to ::1
      if ! grep -E "::1[[:space:]]+.*mypte\.pearsonpte\.com" /etc/hosts; then
        echo "${HOSTS_LINE_IPV6}" | sudo tee -a /etc/hosts >/dev/null
      fi
    fi
  fi
}

create_certificates() {
  sudo mkdir -p "${CERT_DIR}"

  if command -v mkcert >/dev/null 2>&1; then
    mkcert -install
    TMP_CERT_DIR="$(mktemp -d)"
    mkcert \
      -cert-file "${TMP_CERT_DIR}/mypte-local.crt" \
      -key-file "${TMP_CERT_DIR}/mypte-local.key" \
      mypte.pearsonpte.com \
      id.mypte.pearsonpte.com
    sudo cp "${TMP_CERT_DIR}/mypte-local.crt" "${CERT_FILE}"
    sudo cp "${TMP_CERT_DIR}/mypte-local.key" "${KEY_FILE}"
    rm -rf "${TMP_CERT_DIR}"
  elif [[ ! -f "${CERT_FILE}" || ! -f "${KEY_FILE}" ]]; then
    sudo openssl req \
      -x509 \
      -nodes \
      -newkey rsa:2048 \
      -days 825 \
      -keyout "${KEY_FILE}" \
      -out "${CERT_FILE}" \
      -subj "/CN=mypte.pearsonpte.com" \
      -addext "subjectAltName=DNS:mypte.pearsonpte.com,DNS:id.mypte.pearsonpte.com"
    echo "Warning: generated a self-signed certificate. Brave will reject it for HSTS domains until this certificate is trusted."
  fi
}

enable_local_domains() {
  add_hosts_entries
  create_certificates

  if [ -f "${NGINX_DISABLED}" ] && [ ! -f "${NGINX_TARGET}" ]; then
    sudo mv "${NGINX_DISABLED}" "${NGINX_TARGET}"
  else
    sudo cp "${ROOT_DIR}/nginx/id-mypte-local.conf" "${NGINX_TARGET}"
  fi

  sudo nginx -t
  reload_nginx

  echo "Local domains are enabled:"
  echo "  https://mypte.pearsonpte.com"
  echo "  https://id.mypte.pearsonpte.com/Account/Login"
}

disable_local_domains() {
  comment_out_hosts

  if [ -f "${NGINX_TARGET}" ]; then
    sudo mv "${NGINX_TARGET}" "${NGINX_DISABLED}"
  fi

  reload_nginx

  echo "Local domains are disabled. The real world domains should now resolve normally."
}

case "${MODE}" in
  enable)
    enable_local_domains
    ;;
  disable)
    disable_local_domains
    ;;
  *)
    echo "Usage: $0 [enable|disable]"
    echo "  enable  - configure local domains and nginx for mypte.pearsonpte.com / id.mypte.pearsonpte.com"
    echo "  disable - comment out the local hosts entries and disable the local nginx config"
    exit 1
    ;;
esac
