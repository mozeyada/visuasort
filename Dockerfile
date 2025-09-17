# CAB432 Assessment 1 - Visuasort Docker Image
# Professional image processing API with React frontend
# ECR: 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11693860-repo

# syntax=docker/dockerfile:1
FROM node:22-alpine

# Install system dependencies for Sharp image processing and build tools
RUN apk add --no-cache vips-dev fontconfig build-base python3 make g++

# Set working directory
WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install --only=production

# Build React frontend (multi-stage approach)
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

# Copy backend application
WORKDIR /app
COPY controllers ./controllers
COPY middleware ./middleware
COPY routes ./routes
COPY services ./services
COPY tests ./tests
COPY index.js .

# Create required directories
COPY uploads/.gitkeep ./uploads/
COPY data/.gitkeep ./data/

# Initialize empty LowDB database
RUN echo '{"images":[]}' > data/db.json

# Security: Set proper permissions and switch to non-root user
RUN chown -R node:node /app
USER node

# Expose application port
EXPOSE 3000

# Start with single process (achieves >80% CPU on t3.micro)
CMD ["node", "index.js"]