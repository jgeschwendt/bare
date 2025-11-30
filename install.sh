#!/usr/bin/env bash
set -e

CT='\033[0m' 

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'

echo "Installing bare..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is required but not installed.${CT}"
    echo "Please install Node.js 22+ from https://nodejs.org"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}Error: Node.js 22+ is required (you have $(node -v))${CT}"
    exit 1
fi

# Clone bare repository
echo "Cloning bare repository..."
if [ -d ~/.bare-bones/.git ]; then
    echo "Updating existing installation..."
    cd ~/.bare-bones
    git pull origin main
else
    echo "Installing fresh copy..."
    git clone https://github.com/jgeschwendt/bare.git ~/.bare-bones
    cd ~/.bare-bones
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Link globally
echo "Linking CLI..."
npm link

# Initialize repos.json if it doesn't exist
if [ ! -f ~/.bare-bones/repos.json ]; then
    echo '{"repositories":[]}' > ~/.bare-bones/repos.json
fi

# Verify installation
if command -v bare &> /dev/null; then
    echo -e "${GREEN}✓ bare installed successfully!${CT}"
    echo ""
    echo "Get started:"
    echo "  bare dev          # Start the dashboard"
    echo "  bare clone <url>  # Clone a repository"
    echo "  bare --help       # Show all commands"
    echo ""

    # Ask to start dashboard
    read -p "Start bare dashboard now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        bare dev
    fi
else
    echo -e "${RED}✗ Installation failed${CT}"
    exit 1
fi
