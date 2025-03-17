import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand ,ScanCommand} from "@aws-sdk/lib-dynamodb";
 

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    // Extract path parameters and query string parameters
    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const queryStringParameters = event?.queryStringParameters;
    const reviewId = queryStringParameters?.reviewId ? parseInt(queryStringParameters.reviewId) : undefined;
    const reviewerName = queryStringParameters?.reviewerName;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }

    // Prepare the base query parameters for DynamoDB query
    let scanParams: any = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "MovieId  = :movieId",  // KeyConditionExpression to query by Partition Key
      ExpressionAttributeValues: {
        ":movieId": movieId,  // Value for movieId filter
      },
    };

    // Optional filter for reviewId if provided
    if (reviewId) {
      scanParams.KeyConditionExpression += " AND ReviewId  = :reviewId";
      scanParams.ExpressionAttributeValues[":reviewId"] = reviewId;
    }

    // Optional filter for reviewerName if provided
    if (reviewerName) {
      scanParams.FilterExpression = "ReviewerId = :reviewerName";
      scanParams.ExpressionAttributeValues[":reviewerName"] = reviewerName;
    }

    // Execute the query command
    const commandOutput = await ddbDocClient.send(new QueryCommand(scanParams));

    console.log("QueryCommand response:", commandOutput);

    // If no items were returned, handle the case
    if (!commandOutput.Items || commandOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "No reviews found for the specified criteria" }),
      };
    }

    // Return the reviews as response
    const body = {
      data: commandOutput.Items,
    };

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };

  } catch (error: any) {
    console.log("Error:", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
