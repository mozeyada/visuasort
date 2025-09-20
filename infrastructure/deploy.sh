#!/bin/bash

# Visuasort Infrastructure as Code Deployment Script
# Single command deployment of EC2 instance + Docker containers

set -e

STACK_NAME="visuasort-n11693860"
TEMPLATE_FILE="infrastructure/cloudformation.yaml"
REGION="ap-southeast-2"
ECR_REPO="901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11693860-repo:latest"

echo "🚀 Deploying Visuasort Infrastructure..."
echo "📋 Stack Name: $STACK_NAME"
echo "🌏 Region: $REGION"
echo "📄 Template: $TEMPLATE_FILE"
echo ""

# Deploy CloudFormation stack (secrets from Secrets Manager)
aws cloudformation deploy \
  --template-file "$TEMPLATE_FILE" \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

echo ""
echo "✅ Deployment completed!"
echo ""

# Get stack outputs
echo "📊 Stack Outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table

echo ""
echo "🔗 Getting application URL..."
APP_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' \
  --output text)

echo "🌐 Application URL: $APP_URL"
echo "👤 Login credentials:"
echo "   Admin: admin / password"
echo "   User:  user / password"
echo ""
echo "⏳ Note: Allow 2-3 minutes for application to fully start"
echo "🧪 Test with: curl $APP_URL/health"
echo "🎯 Load test: BASE_URL=$APP_URL npm run load-test"