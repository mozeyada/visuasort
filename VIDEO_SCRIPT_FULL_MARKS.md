# VISUASORT - CORRECTED VIDEO SCRIPT (ACTUAL REQUIREMENTS)
## CAB432 Assessment 1 - Mohamed Zeyada (n11693860)

**Based on ACTUAL video requirements from submission rules**
**6 Required Demonstrations in Order - Keep Brief!**

---

## **REQUIREMENT 1: Docker Image (0:00 - 0:45)**

### **SCREEN**: VS Code with Dockerfile open
**SAY**: "This is Mohamed Zeyada, n11693860. Starting with the Docker image."
**SHOW**: Dockerfile content briefly
**SAY**: "Here's my Dockerfile for the Visuasort application."

### **SCREEN**: AWS Console - ECR
**SAY**: "And here's the image repository on ECR."
**SHOW**: Navigate to `Mo-n11693860 - Assessment 1` repository
**SHOW**: The pushed Docker image
**SAY**: "Image successfully pushed to ECR."

---

## **REQUIREMENT 2: App Running on EC2 (0:45 - 1:30)**

### **SCREEN**: Terminal
**SAY**: "Now running the app from ECR on EC2 instance."
**TYPE**: `ssh -i key.pem ubuntu@your-ec2-ip`
**TYPE**: `docker run -p 3000:3000 [ecr-image-url]`
**SHOW**: Container starting
**SAY**: "App is now running on EC2 from the ECR repository."

### **SCREEN**: Browser
**NAVIGATE TO**: `http://your-ec2-ip:3000`
**SHOW**: App loading (React frontend or API response)
**SAY**: "Application is operational."

---

## **REQUIREMENT 3: REST API (1:30 - 2:15)**

### **SCREEN**: Browser or Postman
**SAY**: "Summarising the REST API endpoints and functionality."
**SHOW**: Brief view of API endpoints (can be code or Postman)
**SAY**: "The API has versioned endpoints for image upload, retrieval, search, filtering, and user authentication with JWT. Admin users have additional endpoints for managing all users' images."

---

## **REQUIREMENT 4: Two Kinds of Data (2:15 - 3:00)**

### **SCREEN**: File explorer showing uploads folder
**SAY**: "The application uses two kinds of data. First: unstructured binary image files."
**SHOW**: Image files in uploads folder
**SAY**: "These are stored in the filesystem."

### **SCREEN**: Text editor with db.json open
**SAY**: "Second: structured metadata stored in LowDB."
**SHOW**: JSON structure with image metadata
**SAY**: "This contains searchable information like tags, ownership, and timestamps for querying and filtering."

---

## **REQUIREMENT 5: CPU Intensive Task (3:00 - 3:45)**

### **SCREEN**: Code editor showing imageService.js
**SAY**: "The CPU intensive task is image processing using Sharp."
**SHOW**: Processing functions briefly
**SAY**: "It operates on uploaded images, applying auto-enhancement, artistic filters, watermarking, and generating multiple output formats. Implemented with statistical analysis and multi-pass blur and sharpen operations."

### **SCREEN**: Upload demonstration (optional)
**SHOW**: Quick image upload with processing
**SAY**: "Here's the processing in action."

---

## **REQUIREMENT 6: CPU Load Testing (3:45 - 5:00)**

### **SCREEN**: Terminal
**SAY**: "Demonstrating the method for triggering CPU load."
**TYPE**: `node tests/cpu-load-test.js`
**SHOW**: Load test starting
**SAY**: "This script generates sustained load by processing multiple images simultaneously."

### **SCREEN**: AWS Console - CloudWatch
**SAY**: "Here's the CPU utilization on AWS console."
**SHOW**: EC2 instance monitoring page
**SHOW**: CPU utilization graph showing >80% load
**SAY**: "The graph shows sustained CPU load above 80% for the required 5-minute period."

### **SCREEN**: Back to terminal (optional)
**SHOW**: Load test completion
**SAY**: "Load testing successfully demonstrates the CPU-intensive capability. Thank you."

---

## **KEY DIFFERENCES FROM MY PREVIOUS SCRIPT:**

❌ **REMOVED** (Not required by video rules):
- Detailed API demonstrations with Postman
- JWT token copying and authentication flows  
- Role distinction demonstrations
- Health endpoint checks
- Detailed REST feature explanations

✅ **KEPT** (Actually required):
- Brief summaries as specified
- The 6 required demonstrations in order
- Focus on showing functionality, not explaining

## **PREPARATION CHECKLIST:**

**BEFORE RECORDING:**
- [ ] Have Dockerfile accessible
- [ ] Login to AWS Console (ECR + CloudWatch tabs)
- [ ] Ensure EC2 instance is running
- [ ] Test load script works: `node tests/cpu-load-test.js`
- [ ] Have `data/db.json` and `uploads/` folder accessible
- [ ] Optional: Have Postman ready for brief API overview

**REMEMBER:**
- Keep explanations **brief** ("summarise" means short!)
- **Show functionality**, don't explain everything
- Follow the **exact 6 requirements in order**
- Total time: **5 minutes maximum**

**This corrected script follows the ACTUAL video requirements from the submission rules.**