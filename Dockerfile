# Visuasort - Professional Image Processing API
# Multi-stage Docker build for Node.js application with React frontend

# syntax=docker/dockerfile:1
FROM node:22-alpine

# Install system dependencies for Sharp image processing and build tools
RUN apk add --no-cache vips-dev fontconfig build-base python3 make g++

# Set working directory
WORKDIR /app

# Build React frontend first
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

# Install backend dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend application
COPY controllers ./controllers
COPY middleware ./middleware
COPY routes ./routes
COPY services ./services
COPY setup-*.js ./
COPY create-*.js ./
COPY check-*.js ./
COPY index.js .

# Frontend build is already in place from the build step above
# No additional copy needed - index.js serves from frontend/build

# Security: Set proper permissions and switch to non-root user
RUN chown -R node:node /app
USER node

# Expose application port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]