import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const queryStringParameters = event?.queryStringParameters;
    const reviewId = queryStringParameters?.reviewId ? parseInt(queryStringParameters.reviewId) : undefined;
    const reviewerName = queryStringParameters?.reviewerName;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }

    let queryParams: any = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "MovieId = :movieId",
      ExpressionAttributeValues: {
        ":movieId": movieId,
      },
    };

    // If reviewId is provided, include it in KeyConditionExpression to fetch a single review
    if (reviewId !== undefined) {
      queryParams.KeyConditionExpression += " AND ReviewId = :reviewId";
      queryParams.ExpressionAttributeValues[":reviewId"] = reviewId;
    }

    // If reviewerName is provided, use a FilterExpression (post-query filtering)
    if (reviewerName) {
      queryParams.FilterExpression = "ReviewerId = :reviewerName";
      queryParams.ExpressionAttributeValues[":reviewerName"] = reviewerName;
    }

    const commandOutput = await ddbDocClient.send(new QueryCommand(queryParams));
    console.log("QueryCommand response:", commandOutput);

    if (!commandOutput.Items || commandOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Message: "No reviews found for the specified criteria" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: commandOutput.Items }),
    };
  } catch (error: any) {
    console.log("Error:", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
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
