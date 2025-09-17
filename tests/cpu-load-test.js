const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
let token = null;
let testStartTime = null;

async function authenticate() {
  try {
    console.log('Authenticating...');
    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      username: 'admin',
      password: 'password'
    });
    token = response.data.token;
    console.log('Authentication successful');
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

// PHASE 1: Stage files using your existing /stage endpoint
async function stageFiles(count = 100) {
  console.log(`\n--- PHASE 1: Staging ${count} files ---`);
  const stagedIds = [];
  
  for (let i = 0; i < count; i++) {
    const filename = `stage_${Date.now()}_${i}.jpg`;
    const testImagePath = path.join(__dirname, filename);
    
    try {
      // Create LARGE, HIGH-QUALITY images for maximum CPU load
      await sharp({
        create: { width: 3000, height: 2000, channels: 3, background: { r: 0, g: 0, b: 255 } }
      }).jpeg({ quality: 95 }).toFile(testImagePath);
      
      // Stage via your existing endpoint
      const formData = new FormData();
      formData.append('image', fs.createReadStream(testImagePath));

      const response = await axios.post(`${BASE_URL}/api/v1/images/stage`, formData, {
        headers: { 'Authorization': `Bearer ${token}`, ...formData.getHeaders() }
      });
      
      stagedIds.push(response.data.imageId);
      console.log(`[${i + 1}/${count}] Staged: ${response.data.imageId}`);
      
    } catch (err) {
      console.error(`Failed to stage file ${i + 1}:`, err.response?.data || err.message);
    } finally {
      if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
    }
  }
  
  console.log(`Staging complete: ${stagedIds.length} files ready`);
  return stagedIds;
}

// PHASE 2: Hammer your existing /process/:imageId endpoint
async function hammerProcessing(stagedIds, duration = 300000) {
  if (stagedIds.length === 0) {
    console.error('No staged files available');
    return;
  }
  
  console.log(`\n--- PHASE 2: CPU Load Test (${duration/1000}s) ---`);
  
  const startTime = Date.now();
  const endTime = startTime + duration;
  let processCount = 0;
  
  const cpuTestStartTime = new Date();
  console.log(`>>CPU TEST STARTED: ${cpuTestStartTime.toLocaleTimeString()}`);
  
  // Ensure continuous load for full 5 minutes
  const workers = Array(32).fill(0).map(async (_, workerId) => {
    while (Date.now() < endTime) {
      const imageId = stagedIds[Math.floor(Math.random() * stagedIds.length)];
      
      try {
        // Use your existing /process/:imageId endpoint
        await axios.post(`${BASE_URL}/api/v1/images/process/${imageId}`, {
          autoEnhance: true,
          addWatermark: true,
          applyFilter: 'dramatic'
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        processCount++;
        if (processCount % 25 === 0) {
          console.log(`Processed ${processCount} requests`);
        }
        
      } catch (err) {
        // Expected in load testing - just log occasionally
        if (processCount % 50 === 0) {
          console.error(`[Worker ${workerId}] Error:`, err.response?.status || err.message);
        }
      }
    }
  });

  await Promise.all(workers);

  const totalTime = (Date.now() - startTime) / 1000;
  const cpuTestEndTime = new Date();
  console.log(`\nCPU TEST COMPLETE!`);
  console.log(`CPU Test Started: ${cpuTestStartTime.toLocaleTimeString()}`);
  console.log(`CPU Test Ended: ${cpuTestEndTime.toLocaleTimeString()}`);
  console.log(`Total processing requests: ${processCount}`);
  console.log(`Rate: ${(processCount / totalTime).toFixed(2)} requests/second`);
  console.log(`⏱️  Duration: ${totalTime.toFixed(1)}s`);
  console.log(`\nCHECK CLOUDWATCH FOR >80% CPU DURING THIS TIME WINDOW!`);
}

async function runCompliantLoadTest() {
  testStartTime = new Date();
  console.log('Starting Rule-Compliant Load Test');
  console.log(`Test started at: ${testStartTime.toLocaleTimeString()}`);
  
  try {
    await authenticate();
    const stagedIds = await stageFiles(80); // Optimal: 70 capacity + 15% safety margin
    await hammerProcessing(stagedIds, 300000); // 5 minutes
  } catch (error) {
    console.error('Load test failed:', error.message);
    process.exit(1);
  }
}

runCompliantLoadTest().catch(console.error);