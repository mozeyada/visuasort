# CAB432 Assessment 1 - Submission Checklist

## 🚀 PREPARATION STEPS

### 1. Clean Up Project
```bash
node prepare-submission.js
```

### 2. Verify Directory Structure
```
visuasort/
├── index.js                    ✅ Main application entry
├── Dockerfile                  ✅ Container configuration  
├── A1_response_to_criteria.md  ✅ Assessment response (CRITICAL!)
├── package.json                ✅ Dependencies
├── package-lock.json           ✅ Dependency lock
├── docker-compose.yml          ✅ Infrastructure as Code
├── .env.example                ✅ Environment template
├── routes/                     ✅ API route definitions
├── controllers/                ✅ Business logic
├── services/                   ✅ Core services (image, AI, DB)
├── middleware/                 ✅ Authentication middleware
├── tests/                      ✅ Load testing script
├── data/                       ✅ Database directory
│   ├── .gitkeep               ✅ Keep directory
│   └── db.json                ✅ Clean database
├── uploads/                    ✅ File storage directory
│   └── .gitkeep               ✅ Keep directory
└── frontend/                   ✅ React source code
```

### 3. Files to EXCLUDE (❌ DO NOT SUBMIT)
- `node_modules/` - Third-party packages
- `.git/` - Git repository data
- `.env` - Environment secrets
- `*.log` - Log files
- Test images (`*.jpg`, `*.png`, `*.webp` in tests/)
- Extra debug/test scripts
- IDE files (`.vscode/`, `.idea/`, `.amazonq/`)

### 4. Size Check
- **Target:** < 100MB
- **Main contributors:** Frontend source code, application code
- **Excluded:** node_modules (~200MB), test images, git history

### 5. Final Verification
- [ ] `A1_response_to_criteria.md` is present and complete
- [ ] All source code files are included
- [ ] No node_modules directory
- [ ] No .git directory  
- [ ] No test images or temporary files
- [ ] Directory structure matches requirements
- [ ] Total size < 100MB

## 📦 SUBMISSION PROCESS

1. **Clean the project:**
   ```bash
   node prepare-submission.js
   ```

2. **Create ZIP archive:**
   - Select the entire `visuasort/` directory
   - Create ZIP file named: `n11693860_CAB432_A1.zip`
   - Verify size < 100MB

3. **Upload to Canvas:**
   - Submit ZIP file to Canvas assignment
   - Verify upload completed successfully

## ✅ QUALITY ASSURANCE

**Test locally before submission:**
```bash
# Test Docker build
docker build -t visuasort-test .

# Test application start
npm install
npm start

# Test load script
npm run load-test
```

**Expected Score: 30/30** 🎯