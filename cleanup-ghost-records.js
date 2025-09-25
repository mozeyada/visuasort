// Cleanup script to remove ghost DynamoDB records
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({region: 'ap-southeast-2'}));
const tableName = "n11693860-visuasort-images";
const qutUsername = "n11693860@qut.edu.au";

// Ghost records to delete (based on your list)
const ghostFilenames = [
  'Screenshot 2025-08-29 005643.png',
  'Screenshot 2025-08-05 154426.png',
  'WIN_20250824_20_11_58_Pro.jpg'
];

async function cleanupGhostRecords() {
  console.log('🧹 Starting cleanup of ghost records...');
  
  try {
    // Get all records for admin user
    const queryCommand = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "#pk = :pk",
      FilterExpression: "#owner = :owner",
      ExpressionAttributeNames: {
        "#pk": "qut-username",
        "#owner": "owner"
      },
      ExpressionAttributeValues: {
        ":pk": qutUsername,
        ":owner": "admin"
      }
    });

    const response = await client.send(queryCommand);
    const adminImages = response.Items || [];
    
    console.log(`Found ${adminImages.length} admin records`);
    
    // Find and delete ghost records
    let deletedCount = 0;
    
    for (const image of adminImages) {
      // Check if this is a ghost record (filename matches our list)
      const isGhost = ghostFilenames.some(ghostFile => 
        image.filename && image.filename.includes(ghostFile.split('.')[0])
      );
      
      if (isGhost) {
        console.log(`🗑️  Deleting ghost record: ${image.filename} (ID: ${image.id})`);
        
        const deleteCommand = new DeleteCommand({
          TableName: tableName,
          Key: {
            "qut-username": qutUsername,
            "imageId": image.imageId
          }
        });
        
        await client.send(deleteCommand);
        deletedCount++;
      }
    }
    
    console.log(`✅ Cleanup complete! Deleted ${deletedCount} ghost records`);
    
    if (deletedCount > 0) {
      console.log('🔄 Please refresh your admin page to see the changes');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

cleanupGhostRecords();