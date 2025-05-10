import * as cdk from 'aws-cdk-lib';
import { AppApiConstruct } from './app-api-construct'
import { Construct } from "constructs";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApiConstruct } from './auth-api-construct';
import { S3FrontendConstruct } from './s3-frontend-construct';

export class Ca1CdkApisStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolId = userPool.userPoolId;

    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    const userPoolClientId = appClient.userPoolClientId;

    new AuthApiConstruct(this, 'AuthApiConstruct', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });

    new AppApiConstruct(this, 'AppApiConstruct', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });


    
    // stack for frontend deployement
    new S3FrontendConstruct(this, 'S3FrontendStack');
  }
}



