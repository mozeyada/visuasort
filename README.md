# Visuasort

Professional AI-powered image processing and gallery management API with React frontend.

## Features
- **Professional Image Enhancement**: Auto-enhance, artistic filters, watermarking with EXIF orientation preservation
- **CPU Intensive Processing**: Sharp image processing (4 formats per upload)
- **AI Tagging**: Optional Imagga + Hugging Face integration
- **User Roles**: Admin and User with different permissions
- **REST API**: Full CRUD with pagination, sorting, filtering
- **Load Testing**: Automated performance testing
- **Docker Ready**: Single process Docker deployment

## Quick Start

### Local Development
```bash
npm install
cp .env.example .env  # Configure API keys and AWS credentials
npm run setup-dynamodb  # Create DynamoDB table
npm run build-frontend
npm start
```

### Docker Compose (Recommended)
```bash
docker-compose up --build
```

### Manual Docker
```bash
docker build -t visuasort .
docker run -p 3000:3000 -e IMAGGA_API_KEY=your_key visuasort
```

## User Accounts

| Username | Password | Role | Capabilities |
|----------|----------|------|-------------|
| `admin` | `password` | Admin | View all users' images, delete any image |
| `user` | `password` | User | View/manage own images only |

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login (returns JWT)

### Images (User)
- `POST /api/v1/images/upload` - Upload image (with optional AI tagging)
- `GET /api/v1/images` - Get user's images (paginated)
- `GET /api/v1/images/search?query=term` - Search user's images
- `GET /api/v1/images/filter?sizeRange=large` - Filter images
- `GET /api/v1/images/categories` - Get tag categories
- `GET /api/v1/images/:id` - Get specific image
- `DELETE /api/v1/images/:id` - Delete user's image

### Load Test Endpoints
- `POST /api/v1/images/stage` - Fast upload, returns unique ID
- `POST /api/v1/images/process/:imageId` - CPU-intensive processing

### Admin Only
- `GET /api/v1/images/admin/all` - Get all users' images
- `DELETE /api/v1/images/admin/:id` - Delete any image

### System
- `GET /health` - Health check

## Upload Options

**Default**: Images tagged as "Personal" (fast, no API usage)
**AI Tagging**: Check "Use AI tagging" for Imagga + Hugging Face analysis
**Professional Enhancement**:
- **Auto-enhance**: Intelligent brightness/contrast/sharpness adjustment
- **Artistic Filters**: Vintage, Dramatic, B&W Artistic, Soft Portrait
- **Watermarking**: "VISUASORT" branding with visibility background
- **EXIF Orientation**: Automatic rotation preservation

## Load Testing

**Architecture**: Separated staging/processing for optimal performance
- **Stage once**: Upload image to `/api/images/stage` (returns ID)
- **Process repeatedly**: Call `/api/images/process/:id` with small requests
- **Result**: High CPU utilization with network efficiency

```bash
# Run compliant load test
BASE_URL=http://your-ec2-ip:3000 node tests/cpu-load-test.js
```

## Environment Variables

```bash
# Required
JWT_SECRET=your_jwt_secret

# AWS Configuration (local development only)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token
AWS_REGION=ap-southeast-2

# Optional (for AI tagging)
IMAGGA_API_KEY=your_imagga_key
IMAGGA_API_SECRET=your_imagga_secret
HUGGINGFACE_API_KEY=your_hf_key
```

## Architecture

- **Backend**: Node.js + Express + DynamoDB
- **Frontend**: React (built into backend)
- **Image Processing**: Sharp with professional enhancement service
  - Auto-enhancement with statistical analysis
  - Artistic filters (vintage, dramatic, B&W, soft portrait)
  - Watermarking with SVG composite
  - EXIF orientation preservation
  - Multi-format output (JPEG, WebP, thumbnails)
- **Authentication**: JWT with role-based access
- **AI Integration**: Imagga + Hugging Face APIs
- **Deployment**: Docker single process

## Technical Highlights

### Core Features
- **CPU Intensive Task**: Sharp image processing with professional enhancements
- **Load Testing**: Optimized staging/processing architecture
- **Data Types**: Unstructured (S3 images) + Structured (DynamoDB metadata)
- **Containerized**: Docker + ECR ready with single process
- **Deploy Container**: EC2 + ECR deployment via Docker Compose
- **REST API**: Full HTTP methods with proper status codes
- **User Login**: JWT with Admin/User role distinctions

### Advanced Features
- **Extended API**: Pagination, sorting, filtering consistently implemented
- **External APIs**: Imagga + Hugging Face dual AI integration
- **Custom Processing**: Professional image enhancement algorithms
- **Web Client**: React interface with all API endpoints
- **Infrastructure as Code**: CloudFormation + Docker Compose (full deployment)
