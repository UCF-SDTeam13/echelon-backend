// Required to use AWS Cognito JavaScript SDK in Node.js
global.fetch = require('node-fetch');

global.navigator = () => null;

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

const dotenv = require('dotenv');
// Environment Variable Import
dotenv.config({ path: '.env' });

const mysql = require('mysql2/promise');

// HTTP Response
let response;

// Cognito Pool Information
const poolData = {
  UserPoolId: process.env.COGNITO_USERPOOLID,
  ClientId: process.env.COGNITO_CLIENTID,
};

// Authenticate User and Return Cognito Token Promise
async function authenticate(username, password) {
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
  const authenticationData = {
    Username: username,
    Password: password,
  };
  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
  const userData = {
    Username: username,
    Pool: userPool,
  };
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  const cognitoPromise = (authDetails) => new Promise(
    (resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess(result) {
          /* NOTE: Use the idToken for Logins Map when Federating User Pools with identity pools
          or when passing through an Authorization Header to an API Gateway Authorizer */
          console.log(result);
          resolve(result);
        },

        onFailure(err) {
          console.log(err);
          reject(err);
        },
      });
    },
  );
  return cognitoPromise(authenticationDetails);
}

// Create User and Return User Promise
async function createUser(username, password, email, dbconnection) {
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

  // List of User Attributes
  const attributeList = [];

  // Prepare Data for Email Attribute
  const dataEmail = {
    Name: 'email',
    Value: email,
  };

  // Convert Email Data to CognitoUserAttribute
  const attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

  // Add Email Attribute to Attribute List
  attributeList.push(attributeEmail);

  // NOTE: userPool.signUp DOES NOT work with promisify - Uses Custom Promise Instead
  const signupPromise = (user, pass, attrList) => new Promise(
    (resolve, reject) => {
      userPool.signUp(user, pass, attrList, null, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.user);
        }
      });
    },
  );

  await dbconnection.execute('INSERT INTO UserProfile VALUES (?, ?, TRUE, 0);', [username, email]);
  await dbconnection.execute('INSERT INTO Customization VALUES (?, ?);', [username, 'N/A']);
  return signupPromise(username, password, attributeList);
}
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
exports.lambdaHandler = async (event, context) => {
  // Set database connection parameters, pulling credentials from env
  const dbconnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DB,
  });
  // Connect to database
  /*
  dbconnection.connect((err) => {
    if (err) {
      callback(err);
    }
  });
  */
  try {
    // Log Event
    console.log(event);
    // Log Context
    console.log(context);
    switch (event.resource) {
      // Login Authentication POST
      case '/auth/login':
        // custom console
        console.log('Authenticating');
        // Check for Request Body
        if (event.body) {
          // Parse and Wait for Authentication
          const params = JSON.parse(event.body);
          const cognitoToken = await authenticate(params.username, params.password);
          console.log('Authenticated');
          // Respond with HTTP 200 OK and Token
          console.log('200 OK');
          response = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Authentication Successful',
              idToken: cognitoToken.idToken.jwtToken,
              refreshToken: cognitoToken.refreshToken.token,
              accessToken: cognitoToken.accessToken.jwtToken,
              username: cognitoToken.idToken.payload['cognito:username'],
              iat: `${cognitoToken.idToken.payload.iat}`,
              exp: `${cognitoToken.idToken.payload.exp}`,
            }),
          };
        } else {
          console.log('400 Bad Request - Body Missing');
          response = {
            statusCode: 400,
            body: JSON.stringify({
              message: 'Bad Request',
            }),
          };
        }

        break;

      // Create User POST
      case '/auth/user':
        // Check for Request Body
        if (event.body) {
          // Parse, and Wait for User Creation
          const params = JSON.parse(event.body);
          console.log('Creating User');
          const cognitoUser = await createUser(
            params.username, params.password, params.email, dbconnection,
          );
          // Respond with HTTP 201 Created
          response = {
            statusCode: 201,
            body: JSON.stringify({
              message: 'User Created',
              username: cognitoUser.username,
            }),
          };
        } else {
          console.log('400 Bad Request - Body Missing');
          response = {
            statusCode: 400,
            body: JSON.stringify({
              message: 'Bad Request',
            }),
          };
        }
        break;

      default:
        console.log(`Unknown Resource ${event.resource}`);
        break;
    }
  } catch (err) {
    console.log(err);
    return err;
  }
  return response;
};
