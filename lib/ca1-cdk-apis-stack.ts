import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { generateBatch } from "../shared/utils";
import * as custom from "aws-cdk-lib/custom-resources";
import {movieReviews} from "../seed/movieReviews"
 

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
  }

 
 
 

}
