import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand ,ScanCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";
 

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    // Extract path parameters and query string parameters
    
    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const reviewId = pathParameters?.reviewId ? parseInt(pathParameters.reviewId) : undefined;
  

    if (!movieId || !reviewId) {
        return {
          statusCode: 400,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ Message: "Missing movie Id or review Id in the request"}),
        };
      }

      if(!event.body){
        return {
            statusCode:400,
            headers:{

                "content-type":"application/json"
            },
            body:JSON.stringify({ Message: "Missing update content" })
        }
    }

      const requestBody =  JSON.parse(event.body);
    
    
      const response = await ddbDocClient.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          MovieId: Number(movieId),
          ReviewId: Number(reviewId),
        },
        UpdateExpression: "SET Content = :content",
        ExpressionAttributeValues: {
          ":content": requestBody,
        },
        ReturnValues: "ALL_NEW",
      }));
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Review updated successfully",
          updatedReview: response.Attributes,
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
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
