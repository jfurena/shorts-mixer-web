#!/bin/bash
set -e

echo "=========================================="
echo "Iniciando configuración automática del VPS"
echo "=========================================="

# 1. Update and install basic dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ffmpeg python3 python3-pip python3-venv debian-keyring debian-archive-keyring apt-transport-https

# 2. Install Node.js (LTS)
if ! command -v node &> /dev/null
then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. Install Caddy (for automatic SSL and reverse proxy)
if ! command -v caddy &> /dev/null
then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install caddy -y
fi

# 4. Configure Caddyfile for nip.io domain
# Replace this with your actual VPS IP address
VPS_IP=$(curl -s ifconfig.me)
DOMAIN="${VPS_IP//./-}.nip.io"

echo "Tu dominio automático será: https://$DOMAIN"

sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
$DOMAIN {
    reverse_proxy localhost:3000
}
EOF

sudo systemctl restart caddy

# 5. Install PM2 to keep the Node server alive
sudo npm install -g pm2

echo "=========================================================="
echo "¡VPS Configurado Exitosamente!"
echo "Tu API estará disponible en: https://$DOMAIN"
echo "=========================================================="
echo "Siguientes pasos:"
echo "1. Sube los archivos del backend a esta máquina (server.ts, package.json, etc)"
echo "2. Ejecuta 'npm install'"
echo "3. Compila el server: 'npx tsc server.ts' o usa 'npx tsx server.ts'"
echo "4. Inícialo: 'pm2 start npx --name \"shorts-mixer-api\" -- tsx server.ts'"
echo "=========================================================="
