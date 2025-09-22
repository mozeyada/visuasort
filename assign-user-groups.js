const cognitoService = require('./services/cognitoService');

async function assignUserGroups() {
  console.log('Assigning users to groups...');
  
  try {
    // Add admin user to admins group
    console.log('Adding admin user to admins group...');
    await cognitoService.addUserToGroup('admin', 'admins');
    
    // Add regular user to users group
    console.log('Adding user to users group...');
    await cognitoService.addUserToGroup('user', 'users');
    
    console.log('✅ User group assignments completed successfully!');
    
  } catch (error) {
    console.error('❌ Error assigning user groups:', error.message);
  }
}

assignUserGroups();