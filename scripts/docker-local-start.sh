#!/bin/bash
#
# Docker Local Development Startup Script
# ========================================
# Starts the Payload CMS application in Docker with connection to local MongoDB
#
# Prerequisites:
# - Docker and Docker Compose installed
# - MongoDB running on localhost:27017
# - .env file with DATABASE_URI configured
#
# Usage:
#   ./scripts/docker-local-start.sh        # Start with existing .env
#   ./scripts/docker-local-start.sh build  # Force rebuild
#   ./scripts/docker-local-start.sh logs   # View logs only
#   ./scripts/docker-local-start.sh stop   # Stop containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.local.yml"
COMPOSE_PROJECT="payload-local"
MONGO_PORT=27017
APP_PORT=3101

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Payload Docker Local Start${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if MongoDB is running
check_mongodb() {
    echo -e "${YELLOW}Checking MongoDB availability...${NC}"
    
    # Check if port is open
    if nc -z 127.0.0.1 $MONGO_PORT 2>/dev/null; then
        echo -e "${GREEN}✓ MongoDB is running on port $MONGO_PORT${NC}"
        return 0
    else
        echo -e "${RED}✗ MongoDB is NOT running on port $MONGO_PORT${NC}"
        echo ""
        echo -e "${YELLOW}Please start MongoDB first:${NC}"
        echo "  - macOS: brew services start mongodb-community"
        echo "  - Linux: sudo systemctl start mongod"
        echo "  - Docker: docker run -d -p 27017:27017 mongo"
        return 1
    fi
}

# Function to verify .env file
check_env() {
    echo -e "${YELLOW}Checking .env file...${NC}"
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓ .env file exists${NC}"
        
        # Check DATABASE_URI
        if grep -q "DATABASE_URI" .env; then
            echo -e "${GREEN}✓ DATABASE_URI found in .env${NC}"
        else
            echo -e "${RED}✗ DATABASE_URI not found in .env${NC}"
            echo -e "${YELLOW}Creating from template...${NC}"
            cp .env.docker-local .env
            echo -e "${GREEN}✓ Created .env from .env.docker-local template${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ .env file not found${NC}"
        echo -e "${YELLOW}Creating from template...${NC}"
        cp .env.docker-local .env
        echo -e "${GREEN}✓ Created .env from .env.docker-local template${NC}"
        echo -e "${YELLOW}⚠ Please edit .env and set your DATABASE_URI if needed${NC}"
    fi
    echo ""
}

# Function to build Docker image
build_image() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    docker compose -f "$COMPOSE_FILE" build --no-cache app
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
    echo ""
}

# Function to start containers
start_containers() {
    echo -e "${YELLOW}Starting containers...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d app
    echo -e "${GREEN}✓ Container started${NC}"
    echo ""
}

# Function to show status
show_status() {
    echo -e "${BLUE}Container Status:${NC}"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}Container Logs (Ctrl+C to exit):${NC}"
    docker compose -f "$COMPOSE_FILE" logs -f app
}

# Function to stop containers
stop_containers() {
    echo -e "${YELLOW}Stopping containers...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}✓ Containers stopped${NC}"
}

# Function to wait for app to be healthy
wait_for_healthy() {
    echo -e "${YELLOW}Waiting for application to be healthy...${NC}"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT | grep -q "200\|301\|302"; then
            echo -e "${GREEN}✓ Application is healthy!${NC}"
            return 0
        fi
        echo -ne "  Attempt $attempt/$max_attempts...\r"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo ""
    echo -e "${RED}✗ Application did not become healthy in time${NC}"
    echo -e "${YELLOW}Check logs with: docker compose -f $COMPOSE_FILE logs app${NC}"
    return 1
}

# Main logic
case "${1:-start}" in
    build)
        echo -e "${BLUE}Build mode: Force rebuild${NC}"
        check_env
        check_mongodb
        build_image
        start_containers
        show_status
        wait_for_healthy
        ;;
    logs)
        echo -e "${BLUE}Logs mode${NC}"
        show_logs
        ;;
    stop)
        echo -e "${BLUE}Stop mode${NC}"
        stop_containers
        ;;
    restart)
        echo -e "${BLUE}Restart mode${NC}"
        stop_containers
        check_env
        check_mongodb
        build_image
        start_containers
        show_status
        wait_for_healthy
        ;;
    status)
        echo -e "${BLUE}Status mode${NC}"
        show_status
        ;;
    start|*)
        echo -e "${BLUE}Start mode${NC}"
        check_env
        check_mongodb || exit 1
        start_containers
        show_status
        wait_for_healthy
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Application URLs:${NC}"
echo -e "${GREEN}  - App:      http://localhost:$APP_PORT${NC}"
echo -e "${GREEN}  - Payload:  http://localhost:$APP_PORT/admin${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs:  ./scripts/docker-local-start.sh logs"
echo "  Stop:       ./scripts/docker-local-start.sh stop"
echo "  Rebuild:    ./scripts/docker-local-start.sh build"
echo ""
