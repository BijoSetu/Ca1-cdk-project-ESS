## Enterprise Web Development module - Serverless REST Assignment.

__Name:__ Bijo Sabu  
__Demo:__ [Link to your YouTube video demonstration](...)  

### Overview  

This repository contains a CDK stack that can be deployed to CloudFormation. The CDK app has authentication APIs, including:  

- Sign In  
- Sign Up  
- Confirm Sign Up  
- Sign Out  

The REST API of the stack includes endpoints for users to add, update, retrieve, and get translated versions of movie reviews.  

### App API endpoints  

- **GET** `/movie/reviews/{movieId}` - Get all the reviews for the specified movie. It also supports an optional query string that specifies a review ID or reviewer identity (email address), e.g., `?reviewId=1234` or `?reviewerName=joe@gmail.com`.  
- **POST** `/movie/protected/reviews` - Add a movie review. Only authenticated users can post a review.  
- **GET** `/reviews/{reviewId}/{movieId}/translation` - Requires an optional parameter `"language"` for translation. The language code must be provided as input.  
- **PUT** `/movie/reviews/{movieId}/protected/reviews/{reviewId}` - Update a review for a specific movie. Only authenticated users can update a review.  

### Features  

#### Translation persistence  

The database stores translation data with the following schema:  

```
+ MovieId (Partition key) - Number
+ ReviewId - Number (Autogenerated)
+ ReviewerId - String (Reviewer’s email address)
+ ReviewDate - String, e.g., “2025-01-20” (Updatable)
+ Content - String (Review text, Updatable)
+ Translations - Map<string, string> (Updatable)
```

#### Custom L2 Construct (if completed)  

##### Constructs used and input properties  

**AppApiConstruct Input Props:**  

```typescript
type AppApiProps = {  
  userPoolId: string;  
  userPoolClientId: string;  
};  
```

**AppApiConstruct Public Properties:**  

```typescript
export class AppApiConstruct extends Construct {  
  public readonly api: apigateway.RestApi;  
}
```

**AuthApiConstruct Input Props:**  

```typescript
type AuthApiProps = {  
  userPoolId: string;  
  userPoolClientId: string;  
};  
```

```typescript
export class AuthApiConstruct extends Construct {  
  private auth: apig.IResource;  
  private userPoolId: string;  
  private userPoolClientId: string;  
}
```

#### Restricted Review Updates  

- The **PUT** and **POST** REST APIs that handle posting and updating reviews can only be accessed by existing users.  
- An **Authorization token** received during sign-up must be used in the API request header to perform these actions.  
