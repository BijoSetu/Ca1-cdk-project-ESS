import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { generateBatch } from "../shared/utils";
import * as custom from "aws-cdk-lib/custom-resources";
import { movieReviews } from "../seed/movieReviews"
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apig from "aws-cdk-lib/aws-apigateway";
 

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class Ca1CdkApisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables 
    const moviesReviewsTable = new dynamodb.Table(this, "MoviesReviews", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "ReviewId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });



    // resources 
    new custom.AwsCustomResource(this, "movieReviewsInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [moviesReviewsTable.tableName]: generateBatch(movieReviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("movieReviewsInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [moviesReviewsTable.tableArn],
      }),
    });

    // functions
    const getMovieReviewsById = new lambdanode.NodejsFunction(
      this,
      "GetMovieReviewsByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getMovieReviewsById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      },

    );

    // permissions 
    moviesReviewsTable.grantReadData(getMovieReviewsById)

    // REST API 
    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });


    // Get all Movie Reviews by id endpoint
    const movieEndpoint = api.root.addResource("movie");          
const reviewsEndpoint = movieEndpoint.addResource("reviews");  
const specificMovieEndpoint = reviewsEndpoint.addResource("{movieId}"); 
    specificMovieEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieReviewsById, { proxy: true })
    );

    new cdk.CfnOutput(this, "APIEndpoint", {
      value: api.url!,
      description: "The API Gateway endpoint URL",
    });
  }
}




