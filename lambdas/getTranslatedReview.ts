import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand ,UpdateCommand} from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import 'source-map-support/register';



const ddbDocClient = createDDbDocClient();
const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const pathParameters = event?.pathParameters;
    const queryStringParameters = event?.queryStringParameters;

    const reviewId = pathParameters?.reviewId ? Number(pathParameters.reviewId) : undefined;
    const movieId = pathParameters?.movieId ? Number(pathParameters.movieId) : undefined;
    const targetLanguage = queryStringParameters?.language;

    if (!reviewId || !movieId || !targetLanguage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required parameters" }),
      };
    }

    // Fetch the review from DynamoDB
    const response = await ddbDocClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { MovieId: movieId, ReviewId: reviewId },
    }));

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Review not found" }),
      };
    }

    const originalContent = response.Item.Content;
    const translations = response.Item.Translations || {}; // Default to empty object if not present

    // Check if the translation already exists
    if (translations[targetLanguage]) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          originalReview: originalContent,
          translatedReview: `${translations[targetLanguage]} --> (Translation fetched from DB)`,
          language: targetLanguage,
        }),
      };
    }

    // Translate the content
    const translateResponse = await translateClient.send(new TranslateTextCommand({
      Text: originalContent,
      SourceLanguageCode: "en",
      TargetLanguageCode: targetLanguage,
    }));

    const translatedText = translateResponse.TranslatedText;

    // Update DynamoDB to store the new translation
    await ddbDocClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { MovieId: movieId, ReviewId: reviewId },
      UpdateExpression: "SET Translations.#lang = :translation",
      ExpressionAttributeNames: { "#lang": targetLanguage },
      ExpressionAttributeValues: { ":translation": translatedText ,},
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        originalReview: originalContent,
        translatedReview: translatedText,
        language: targetLanguage,
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