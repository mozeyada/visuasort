#!/bin/bash

# VisuaSort ECR Deployment Script
# Usage: ./deploy-to-ecr.sh

set -e  # Exit on any error

# Configuration
AWS_REGION="ap-southeast-2"
AWS_ACCOUNT_ID="901444280953"
ECR_REPOSITORY="n11693860-visuasort"
IMAGE_TAG="latest"
LOCAL_IMAGE_NAME="visuasort"

echo "🚀 Starting VisuaSort ECR Deployment..."

# Step 1: Build Docker image locally
echo "📦 Building Docker image..."
docker build -t ${LOCAL_IMAGE_NAME}:${IMAGE_TAG} .

# Step 2: Tag image for ECR
echo "🏷️  Tagging image for ECR..."
docker tag ${LOCAL_IMAGE_NAME}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}

# Step 3: Login to ECR (will prompt for MFA if needed)
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 4: Create ECR repository if it doesn't exist
echo "📋 Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} 2>/dev/null || \
aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}

# Step 5: Push image to ECR
echo "⬆️  Pushing image to ECR..."
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}

echo "✅ Local deployment complete!"
echo ""
echo "📋 Next steps for EC2 deployment:"
echo "1. SSH to your EC2 instance: ssh -i your-key.pem ec2-user@your-ec2-ip"
echo "2. Run the EC2 deployment commands (see below)"
echo ""
echo "🔗 ECR Image URI:"
echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"

# Generate EC2 deployment commands
cat << 'EOF'

# ========================================
# EC2 DEPLOYMENT COMMANDS
# ========================================
# Run these commands on your EC2 instance:

# 1. Login to ECR from EC2
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com

# 2. Stop and remove existing containers
docker stop visuasort-app 2>/dev/null || true
docker rm visuasort-app 2>/dev/null || true

# 3. Remove old images (optional - saves space)
docker rmi $(docker images -q 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11693860-visuasort) 2>/dev/null || true

# 4. Pull latest image from ECR
docker pull 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11693860-visuasort:latest

# 5. Run new container
docker run -d \
  --name visuasort-app \
  -p 3000:3000 \
  --restart unless-stopped \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11693860-visuasort:latest

# 6. Verify deployment
docker ps
curl http://localhost:3000/health

# 7. Check logs if needed
docker logs visuasort-app

EOF