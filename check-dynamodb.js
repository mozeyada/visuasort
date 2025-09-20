// AWS credentials from IAM role in production
const DynamoDB = require("@aws-sdk/client-dynamodb");
const DynamoDBLib = require("@aws-sdk/lib-dynamodb");

async function checkTable() {
  const client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });
  const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);
  
  try {
    const command = new DynamoDBLib.ScanCommand({
      TableName: "n11693860-visuasort-images"
    });
    
    const response = await docClient.send(command);
    console.log("DynamoDB Table Contents:");
    console.log("Item Count:", response.Count);
    console.log("Items:", JSON.stringify(response.Items, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkTable();
