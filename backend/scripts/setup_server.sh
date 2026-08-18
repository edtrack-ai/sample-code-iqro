#!/bin/bash

# EdTrack AI - Fresh Server Setup Script
# This script installs Docker, Docker Compose, and Git on a fresh Ubuntu/Debian server.

set -e

echo "--- Starting Server Setup ---"

# 1. Update and Upgrade
echo "Updating packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Dependencies
echo "Installing dependencies..."
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release git

# 3. Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "Docker is already installed."
fi

# 4. Install Docker Compose (V2 is usually included in latest Docker)
echo "Checking Docker Compose..."
docker compose version || sudo apt-get install -y docker-compose-plugin

# 5. Prepare Application Directory
echo "Preparing /app directory..."
sudo mkdir -p /app/edtrack-ai
sudo chown -R $USER:$USER /app

# 6. Setup Firewall (Optional but recommended)
echo "Configuring Firewall (allowing 80, 443, 22)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "--- Setup Complete! ---"
echo "IMPORTANT: You may need to log out and log back in for docker group changes to take effect."
