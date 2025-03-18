import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import { generateBatch } from "../shared/utils";
import { movieReviews } from "../seed/movieReviews"
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as custom from "aws-cdk-lib/custom-resources";

export class AppApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string) {
    super(scope, id);

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
   
       const addMovieReviewFn = new lambdanode.NodejsFunction(this, "AddMovieReviewFn", {
         architecture: lambda.Architecture.ARM_64,
         runtime: lambda.Runtime.NODEJS_22_X,
         entry: `${__dirname}/../lambdas/addMovieReview.ts`,
         timeout: cdk.Duration.seconds(10),
         memorySize: 128,
         environment: {
           TABLE_NAME: moviesReviewsTable.tableName,
           REGION: "eu-west-1",
         },
       });
   
   
       const updateMovieReviewFn = new lambdanode.NodejsFunction(this, "updateMovieReviewFn", {
         architecture: lambda.Architecture.ARM_64,
         runtime: lambda.Runtime.NODEJS_22_X,
         entry: `${__dirname}/../lambdas/updateMovieReview.ts`,
         timeout: cdk.Duration.seconds(10),
         memorySize: 128,
         environment: {
           TABLE_NAME: moviesReviewsTable.tableName,
           REGION: "eu-west-1",
         },
       });
   
       const getTranslatedMovieReviewFn = new lambdanode.NodejsFunction(this, "getTranslatedMovieReviewFn", {
         architecture: lambda.Architecture.ARM_64,
         runtime: lambda.Runtime.NODEJS_22_X,
         entry: `${__dirname}/../lambdas/getTranslatedReview.ts`,
         timeout: cdk.Duration.seconds(10),
         memorySize: 128,
         environment: {
           TABLE_NAME: moviesReviewsTable.tableName,
           REGION: "eu-west-1",
         },
       });
   
       // permissions 
       moviesReviewsTable.grantReadData(getMovieReviewsById)
       moviesReviewsTable.grantReadWriteData(addMovieReviewFn)
       moviesReviewsTable.grantReadWriteData(updateMovieReviewFn)
       moviesReviewsTable.grantReadWriteData(getTranslatedMovieReviewFn)
   
       // access for cdk to allow tranlate api access 
   
       getTranslatedMovieReviewFn.addToRolePolicy(
         new iam.PolicyStatement({
           actions: ["translate:TranslateText"],
           resources: ["*"],  
           effect: iam.Effect.ALLOW,
         })
       );
   
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
       const reviewsRootEndpoint = api.root.addResource("reviews")
       const reviewsEndpoint = movieEndpoint.addResource("reviews");
       const specificMovieEndpoint = reviewsEndpoint.addResource("{movieId}");
       const specificReviewEndpoint = specificMovieEndpoint.addResource("reviews").addResource("{reviewId}")
       const translatedReviewEndpoint = reviewsRootEndpoint.addResource("{reviewId}").addResource("{movieId}").addResource("translation")
   
       // get a specific movie by Id
       specificMovieEndpoint.addMethod(
         "GET",
         new apig.LambdaIntegration(getMovieReviewsById, { proxy: true })
       );
   
       // add movie endpoint
       reviewsEndpoint.addMethod(
         "POST",
         new apig.LambdaIntegration(addMovieReviewFn, { proxy: true })
       );
   
       // update movie reviews endpoint
   
       specificReviewEndpoint.addMethod(
         "PUT",
         new apig.LambdaIntegration(updateMovieReviewFn, { proxy: true })
       );
   
       // get a translated movie review
   
       translatedReviewEndpoint.addMethod(
         "GET",
         new apig.LambdaIntegration(getTranslatedMovieReviewFn, { proxy: true })
       );
   
       new cdk.CfnOutput(this, "APIEndpoint", {
         value: api.url!,
         description: "The API Gateway endpoint URL",
       });
     }
}
