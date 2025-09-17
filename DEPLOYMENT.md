# CAB432 Assessment Deployment Guide

## Critical: Single-Process Deployment

**IMPORTANT**: The application MUST be run in single-process mode to pass the load testing criteria. The stage-then-process architecture requires the same process to handle both staging and processing requests.

## Correct EC2 Deployment Command

```bash
# Pull from ECR
docker pull 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11693860-repo:latest

# Run in single-process mode (CRITICAL)
docker run -d \
  --name visuasort-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e JWT_SECRET=supersecret \
  901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11693860-repo:latest \
  node index.js
```

**Key Points:**
- The `node index.js` at the end overrides the PM2 cluster command
- This ensures single-process mode, fixing the 404 error in load testing
- Required for the stage-then-process architecture to work correctly

## Load Testing

```bash
# From your local machine
BASE_URL=http://YOUR_EC2_IP:3000 npm run load-test
```

## Architecture Compliance

✅ **Stage-then-process method**: Separates upload from processing  
✅ **Single-process deployment**: Fixes 404 errors  
✅ **Fontconfig dependency**: Fixes 500 errors  
✅ **Network headroom**: Small JSON requests, not file uploads  

This deployment satisfies all CAB432 assessment requirements.