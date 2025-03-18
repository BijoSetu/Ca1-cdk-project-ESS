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
import * as node from "aws-cdk-lib/aws-lambda-nodejs";


type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};


export class AppApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: AppApiProps) {
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



    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: 'eu-west-1',
        TABLE_NAME: moviesReviewsTable.tableName,
      },
    };

    const getMovieReviewsByIdPublic = new lambdanode.NodejsFunction(
      this,
      "GetMovieReviewsByIdFn",
      {
        ...appCommonFnProps,
        entry: `${__dirname}/../lambdas/getMovieReviewsById.ts`,
      },

    );

    const addMovieReviewFnProtected = new lambdanode.NodejsFunction(this, "AddMovieReviewFn", {
      ...appCommonFnProps,
      entry: `${__dirname}/../lambdas/addMovieReview.ts`,
    });


    const updateMovieReviewFnProtected = new lambdanode.NodejsFunction(this, "updateMovieReviewFn", {
      ...appCommonFnProps,
      entry: `${__dirname}/../lambdas/updateMovieReview.ts`,
    });

    const getTranslatedMovieReviewFnPublic = new lambdanode.NodejsFunction(this, "getTranslatedMovieReviewFn", {
      ...appCommonFnProps,
      entry: `${__dirname}/../lambdas/getTranslatedReview.ts`,
    });

    // permissions 
    moviesReviewsTable.grantReadData(getMovieReviewsByIdPublic)
    moviesReviewsTable.grantReadWriteData(addMovieReviewFnProtected)
    moviesReviewsTable.grantReadWriteData(updateMovieReviewFnProtected)
    moviesReviewsTable.grantReadWriteData(getTranslatedMovieReviewFnPublic)

    // access for cdk to allow translate api access 

    getTranslatedMovieReviewFnPublic.addToRolePolicy(
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

    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
      ...appCommonFnProps,
      entry: "./lambdas/auth/authorizer.ts",
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

    // Get all Movie Reviews by id endpoint

    const movieEndpoint = api.root.addResource("movie");
    const reviewsRootEndpoint = api.root.addResource("reviews")
    const reviewsEndpoint = movieEndpoint.addResource("protected").addResource("reviews");
    const specificMovieEndpoint = reviewsEndpoint.addResource("{movieId}");
    const specificReviewEndpoint = specificMovieEndpoint.addResource("protected").addResource("reviews").addResource("{reviewId}")
    const translatedReviewEndpoint = reviewsRootEndpoint.addResource("{reviewId}").addResource("{movieId}").addResource("translation")

    // get a specific movie by Id
    specificMovieEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieReviewsByIdPublic, { proxy: true })
    );

    // add movie endpoint
    reviewsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(addMovieReviewFnProtected, { proxy: true }), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    }
    );

    // update movie reviews endpoint

    specificReviewEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateMovieReviewFnProtected, { proxy: true },), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    },
    );

    // get a translated movie review

    translatedReviewEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTranslatedMovieReviewFnPublic, { proxy: true })
    );

    new cdk.CfnOutput(this, "APIEndpoint", {
      value: api.url!,
      description: "The API Gateway endpoint URL",
    });
  }
}
