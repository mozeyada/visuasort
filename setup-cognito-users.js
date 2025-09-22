const cognitoService = require('./services/cognitoService');

async function setupTestUsers() {
  console.log('Setting up test users in Cognito...');
  
  try {
    // Create admin user with your real email
    console.log('Creating admin user...');
    const adminResult = await cognitoService.signUp(
      'admin',
      'AdminPass123!',
      'n11693860@qut.edu.au' // Use your QUT email
    );
    console.log('Admin user created:', adminResult.message);
    
    // Create regular user
    console.log('Creating regular user...');
    const userResult = await cognitoService.signUp(
      'user',
      'UserPass123!',
      'n11693860@qut.edu.au' // Use your QUT email
    );
    console.log('Regular user created:', userResult.message);
    
    console.log('\n✅ Test users created successfully!');
    console.log('📧 Check your email for confirmation codes');
    console.log('\nTo confirm users, use:');
    console.log('POST /api/v1/auth/cognito/confirm');
    console.log('Body: { "username": "admin@visuasort.com", "confirmationCode": "123456" }');
    
  } catch (error) {
    console.error('❌ Error setting up users:', error.message);
  }
}

setupTestUsers();