import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

export class S3FrontendConstruct extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create an S3 bucket for hosting the frontend
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `ca-movies-app-frontend`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, // Block ACLs but allow bucket policies
      autoDeleteObjects: true, // Automatically delete objects when the bucket is destroyed
    });

    // Create a CloudFront distribution for the S3 bucket
    const distribution = new Distribution(this, "SiteDistribution", {
      defaultBehavior: {
        origin: new S3Origin(this.bucket), // Replaced siteBucket with this.bucket
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
    });

    // Output the CloudFront distribution domain name
    new cdk.CfnOutput(this, "WebsiteURL", {
      value: this.bucket.bucketWebsiteUrl,
      description: "The S3 bucket website URL",
    });

    new cdk.CfnOutput(this, "CloudFrontURL", {
      value: distribution.distributionDomainName,
      description: "The CloudFront distribution domain name",
    });

    // Output the bucket name and website URL
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'The name of the S3 bucket',
    });

    new cdk.CfnOutput(this, 'BucketWebsiteURL', {
      value: this.bucket.bucketWebsiteUrl,
      description: 'The URL of the S3 bucket website',
    });
  }
}