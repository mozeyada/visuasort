const cognitoService = require('./services/cognitoService');

async function setupCognitoGroups() {
  console.log('Setting up Cognito User Groups...');
  
  try {
    // Create user groups
    await cognitoService.createUserGroups();
    
    console.log('\n🎉 Cognito User Groups setup complete!');
    console.log('\nAvailable groups:');
    console.log('- Administrators: Full access to all features');
    console.log('- Users: Standard user access');
    console.log('\nTo add users to groups after registration:');
    console.log('- Admin: cognitoService.addUserToGroup("username", "Administrators")');
    console.log('- User: cognitoService.addUserToGroup("username", "Users")');
    
  } catch (error) {
    console.error('❌ Error setting up groups:', error.message);
  }
}

setupCognitoGroups();