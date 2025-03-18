import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {AppApiConstruct } from './app-api-construct'



export class Ca1CdkApisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  new AppApiConstruct(this, 'AppApiConstruct');
  }
}




