Assignment 1 - REST API Project - Response to Criteria
================================================

Overview
------------------------------------------------

- **Name:** Mohamed Zeyada
- **Student number:** n11693860
- **Application name:** Visuasort
- **Two line description:** Professional AI-powered image processing and gallery management API with React frontend.
  Provides CPU-intensive image enhancement, AI tagging, and role-based user management.


Core criteria
------------------------------------------------

### Containerise the app

- **ECR Repository name:** Mo-n11693860 - Assessment 1
- **Video timestamp:** [0:00 - 0:30]
- **Relevant files:**
    - visuasort-submission/Dockerfile
    - docker-compose.yml

### Deploy the container

- **EC2 instance ID:** i-0a9917acc318fd599
- **Video timestamp:** [0:30 - 1:15]

### User login

- **One line description:** JWT-based authentication with hardcoded admin/user accounts providing meaningful role distinctions (admin can view/delete all images, users only their own).
- **Video timestamp:** [1:15 - 2:15]
- **Relevant files:**
    - controllers/authController.js
    - middleware/auth.js
    - controllers/imageController.js

### REST API

- **One line description:** Full REST API with proper HTTP methods (GET, POST, PUT, PATCH, DELETE), status codes, versioning, and logical endpoint structure.
- **Video timestamp:** [1:15 - 2:15]
- **Relevant files:**
    - index.js
    - routes/images.js
    - controllers/imageController.js

### Data types

- **One line description:** Two distinct data types: unstructured image files and structured metadata in LowDB.
- **Video timestamp:** [2:15 - 3:00]
- **Relevant files:**
    - services/imageService.js
    - services/dbService.js

#### First kind

- **One line description:** Image files stored as unstructured binary data in filesystem.
- **Type:** Unstructured
- **Rationale:** Large binary files (images) that the application treats as opaque data for storage and retrieval without examining internal structure.
- **Video timestamp:** [2:15 - 3:00]
- **Relevant files:**
    - services/imageService.js
    - controllers/imageController.js

#### Second kind

- **One line description:** Image metadata stored as structured JSON documents in LowDB database.
- **Type:** Structured
- **Rationale:** Searchable, queryable data including tags, ownership, timestamps, and file references that the application directly manipulates.
- **Video timestamp:** [2:15 - 3:00]
- **Relevant files:**
    - services/dbService.js
    - controllers/imageController.js

### CPU intensive task

- **One line description:** Sharp-based image processing with auto-enhancement, artistic filters, watermarking, and multi-format output generation.
- **Video timestamp:** [3:00 - 3:45]
- **Relevant files:**
    - services/imageService.js

### CPU load testing

- **One line description:** Optimized load testing script with 3 workers (matching CPU cores) achieving >80% CPU load for 5 minutes with network headroom for 4-server scalability.
- **Video timestamp:** [3:45 - 5:00]
- **Relevant files:**
    - tests/cpu-load-test.js

Additional criteria
------------------------------------------------

### Extensive REST API features

- **One line description:** API implements versioning (v1), pagination, sorting, filtering, and search consistently across all endpoints.
- **Video timestamp:** [1:15 - 2:15]
- **Relevant files:**
    - index.js
    - controllers/imageController.js
    - services/dbService.js

### External API(s)

- **One line description:** Dual AI integration using Imagga API and Hugging Face API for intelligent image tagging with fallback mechanism.
- **Video timestamp:** [1:15 - 2:15]
- **Relevant files:**
    - services/aiService.js

### Additional types of data

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Custom processing

- **One line description:** Custom image enhancement algorithms including statistical brightness analysis, artistic filter implementations, and SVG-based watermarking.
- **Video timestamp:** [3:00 - 3:45]
- **Relevant files:**
    - services/imageService.js

### Infrastructure as code

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    -

### Web client

- **One line description:** React frontend with authentication, image gallery, upload interface, and admin panel interfacing with all API endpoints.
- **Video timestamp:** [1:15 - 2:15]
- **Relevant files:**
    - frontend/src/App.js
    - frontend/package.json
    - index.js

### Upon request

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 
