require("dotenv").config();
const DynamoDB = require("@aws-sdk/client-dynamodb");

const qutUsername = "n11693860@qut.edu.au";  // Your actual student number
const tableName = "n11693860-visuasort-images";  // Your table name

async function createTable() {
   const client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });

   const command = new DynamoDB.CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
         {
            AttributeName: "qut-username",
            AttributeType: "S",
         },
         {
            AttributeName: "imageId", // Sort key for your images
            AttributeType: "S",
         },
      ],
      KeySchema: [
         {
            AttributeName: "qut-username",
            KeyType: "HASH",
         },
         {
            AttributeName: "imageId",
            KeyType: "RANGE",
         },
      ],
      ProvisionedThroughput: {
         ReadCapacityUnits: 5,  // Higher than practical for your app
         WriteCapacityUnits: 5,
      },
   });

   try {
      const response = await client.send(command);
      console.log("VisuaSort table created:", response);
   } catch (err) {
      console.log("Error creating table:", err.message);
   }
}

createTable();
