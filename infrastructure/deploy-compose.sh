#!/bin/bash

# Visuasort Infrastructure as Code - Docker Compose Deployment
# Single command deployment for existing EC2 instance

set -e

echo "🚀 Deploying Visuasort with Docker Compose..."
echo "🏗️ Infrastructure as Code - Container Orchestration"
echo ""

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com

# Pull latest image
echo "📦 Pulling latest image..."
docker pull 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11693860-repo:latest

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Deploy with Docker Compose
echo "🚀 Deploying infrastructure..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for application to start..."
sleep 10

# Check status
echo "📊 Deployment Status:"
docker-compose ps

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")

echo ""
echo "✅ Deployment completed!"
echo "🌐 Application URL: http://$PUBLIC_IP:3000"
echo "👤 Login credentials:"
echo "   Admin: admin / password"
echo "   User:  user / password"
echo ""
echo "🧪 Test with: curl http://$PUBLIC_IP:3000/health"
echo "🎯 Load test: BASE_URL=http://$PUBLIC_IP:3000 npm run load-test"