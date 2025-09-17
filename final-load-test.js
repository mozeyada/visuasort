const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const sharp = require('sharp');

const BASE_URL = process.env.BASE_URL || 'http://13.55.82.226:3000';
const DURATION = 300;
const WORKERS = 4;

let token = null;
let totalRequests = 0;
let successfulRequests = 0;
let stagedImageIds = [];

async function login() {
  const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
    username: 'admin', password: 'password'
  });
  token = response.data.token;
  console.log('✅ Logged in');
}

async function stageImages() {
  console.log('📤 Staging 10 images...');
  
  for (let i = 0; i < 10; i++) {
    const testPath = `./temp-${i}.jpg`;
    await sharp({
      create: { width: 300, height: 300, channels: 3, background: { r: i*20, g: 100, b: 150 } }
    }).jpeg({ quality: 80 }).toFile(testPath);
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testPath));
    
    const response = await axios.post(`${BASE_URL}/api/v1/images/stage`, formData, {
      headers: { 'Authorization': `Bearer ${token}`, ...formData.getHeaders() }
    });
    
    stagedImageIds.push(response.data.imageId);
    fs.unlinkSync(testPath);
  }
  
  console.log(`✅ Staged ${stagedImageIds.length} images`);
}

async function processImage() {
  const imageId = stagedImageIds[Math.floor(Math.random() * stagedImageIds.length)];
  
  try {
    await axios.post(`${BASE_URL}/api/v1/images/process/${imageId}`, {
      autoEnhance: true,
      addWatermark: true,
      applyFilter: 'dramatic'
    }, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 120000 // 2 minute timeout
    });
    successfulRequests++;
  } catch (error) {
    // Don't log every error, just count them
  }
  totalRequests++;
}

async function worker(workerId) {
  console.log(`🔧 Worker ${workerId} started`);
  const endTime = Date.now() + DURATION * 1000;
  
  while (Date.now() < endTime) {
    await processImage();
    // Small delay to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`🏁 Worker ${workerId} finished`);
}

async function runTest() {
  console.log('🚀 Final Load Test Started');
  console.log(`Duration: ${DURATION}s, Workers: ${WORKERS}`);
  
  await login();
  await stageImages();
  
  console.log('🔥 Starting CPU load generation...');
  const startTime = Date.now();
  
  const workers = [];
  for (let i = 1; i <= WORKERS; i++) {
    workers.push(worker(i));
  }
  
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const rps = (totalRequests / elapsed).toFixed(1);
    const successRate = totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : '0';
    console.log(`${elapsed}s | Requests: ${totalRequests} (${rps}/s) | Success: ${successfulRequests} (${successRate}%)`);
  }, 15000);
  
  await Promise.all(workers);
  clearInterval(interval);
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const avgRps = (totalRequests / totalTime).toFixed(2);
  const successRate = ((successfulRequests / totalRequests) * 100).toFixed(1);
  
  console.log('🏁 Test Complete');
  console.log(`Total: ${totalRequests} requests in ${totalTime}s`);
  console.log(`Success: ${successfulRequests} (${successRate}%)`);
  console.log(`Average: ${avgRps} RPS`);
}

runTest().catch(console.error);