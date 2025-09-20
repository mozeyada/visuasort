const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');

async function setupParameters() {
  const client = new SSMClient({ region: 'ap-southeast-2' });
  
  const parameters = [
    {
      Name: '/n11693860/visuasort/app-url',
      Value: 'http://n11693860-visuasort.cab432.com:3000',
      Type: 'String',
      Description: 'Visuasort application URL for frontend'
    },
    {
      Name: '/n11693860/visuasort/domain-url',
      Value: 'http://n11693860-visuasort.cab432.com:3000',
      Type: 'String',
      Description: 'Domain URL for CORS and frontend configuration'
    },
    {
      Name: '/n11693860/visuasort/api-version',
      Value: 'v1',
      Type: 'String',
      Description: 'API version for routing'
    },
    {
      Name: '/n11693860/visuasort/max-upload-size',
      Value: '10485760',
      Type: 'String',
      Description: 'Maximum upload size in bytes (10MB)'
    }
  ];

  console.log('Setting up Parameter Store parameters...');
  
  for (const param of parameters) {
    try {
      const command = new PutParameterCommand({
        ...param,
        Overwrite: true
      });
      
      await client.send(command);
      console.log(`✅ Created parameter: ${param.Name}`);
    } catch (error) {
      console.error(`❌ Failed to create ${param.Name}:`, error.message);
    }
  }
  
  console.log('\n🎉 Parameter Store setup complete!');
}

setupParameters();