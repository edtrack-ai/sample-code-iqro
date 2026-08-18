#!/bin/bash
# ==============================================================================
# Iqro AI — 1-Click Server Deployment & Setup Script
# VPS Target IP: 169.58.91.148 | Domains: iqro.online & api.iqro.online
# ==============================================================================

set -e

echo "🚀 [1/6] Installing Linux System Dependencies (Docker, Nginx, Certbot, Node.js)..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx certbot python3-certbot-nginx docker.io docker-compose

# Install Node.js 20 LTS for frontend build
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "📂 [2/6] Preparing Directory Structure..."
sudo mkdir -p /var/www/iqro/frontend
sudo mkdir -p /var/www/iqro/backend
sudo chown -R $USER:$USER /var/www/iqro

echo "⚡ [3/6] Building Frontend Assets..."
if [ -d "/var/www/iqro/frontend" ]; then
    cd /var/www/iqro/frontend
    if [ -f "package.json" ]; then
        npm install
        npm run build
        echo "✅ Frontend build complete."
    fi
fi

echo "🐳 [4/6] Launching Backend Docker Services (Daphne, Celery, Redis, Postgres)..."
if [ -d "/var/www/iqro/backend" ]; then
    cd /var/www/iqro/backend
    if [ -f "docker-compose.prod.yml" ]; then
        if docker compose version &> /dev/null; then
            docker compose -f docker-compose.prod.yml down --remove-orphans || true
            docker compose -f docker-compose.prod.yml up -d --build
        else
            docker-compose -f docker-compose.prod.yml down || true
            docker-compose -f docker-compose.prod.yml up -d --build
        fi
        echo "✅ Backend Docker services launched."
    fi
fi

echo "🌐 [5/6] Configuring Nginx Web Server..."
sudo cp /var/www/iqro/backend/nginx/conf.d/iqro.conf /etc/nginx/sites-available/iqro.conf
sudo ln -sf /etc/nginx/sites-available/iqro.conf /etc/nginx/sites-enabled/iqro.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx reloaded successfully."

echo "🔒 [6/6] Requesting Free SSL Certificate via Certbot..."
echo "Run the following command to finalize SSL certificates once DNS records have propagated:"
echo "-----------------------------------------------------------------------------------"
echo "sudo certbot --nginx -d iqro.online -d www.iqro.online -d api.iqro.online"
echo "-----------------------------------------------------------------------------------"

echo "🎉 Deployment setup complete! Access your app at http://iqro.online or http://169.58.91.148"
