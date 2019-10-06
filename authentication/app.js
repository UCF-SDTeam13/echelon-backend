// Required to use AWS Cognito JavaScript SDK in Node.js
global.fetch = require('node-fetch');
global.navigator = () => null;

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

const dotenv = require('dotenv');
// Environment Variable Import
dotenv.config({ path: '.env' });

// HTTP Response
let response;

// Cognito Pool Information
let poolData = {
    UserPoolId : process.env.COGNITO_USERPOOLID,
    ClientId : process.env.COGNITO_CLIENTID
};

// Authenticate User and Return Cognito Token Promise
async function authenticate(username, password) {
    let userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    let authenticationData = {
        Username : username,
        Password : password,
    };
    let authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    let userData = {
        Username : username,
        Pool : userPool
    };
    let cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    let cognitoPromise = (authenticationDetails) => {
        return new Promise(
            (resolve, reject) => {
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: function (result) {
                        let accessToken = result.getAccessToken().getJwtToken();
                        
                        /* NOTE: Use the idToken for Logins Map when Federating User Pools with identity pools
                        or when passing through an Authorization Header to an API Gateway Authorizer */
                        let idToken = result.idToken.jwtToken;
                        console.log(idToken);
                        resolve(idToken);
                    },
                
                    onFailure: function(err) {
                        console.log(err);
                        reject(err);
                    }
                });
            }
        );
    };
    return cognitoPromise(authenticationDetails);
}

// Create User and Return User Promise
async function createUser(username, password, email) {
    let userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    let attributeList = [];

    let dataEmail = {
        Name : 'email',
        Value : email
    };
    
    let attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

    attributeList.push(attributeEmail);

    // NOTE: userPool.signUp DOES NOT work with promisify - Uses Custom Promise Instead
    let signupPromise  = (username, password, attributeList) => {
       return new Promise(
           (resolve, reject) => {
               userPool.signUp(username, password, attributeList, null, function (err, result) {
                   if (err) {
                       reject(err);
                   }
                   else {
                        resolve(result.user);
                   }
               });
           }
       )
    }
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
    try {
        console.log(event);
        switch (event.resource) {
            // Login Authentication POST
            case '/auth/login':
                console.log('Authenticating');
                // Check for Request Body
                if (event.body) {
                    // Parse and Wait for Authentication
                    let params = JSON.parse(event.body);
                    let cognitoToken = await authenticate(params.username, params.password);
                    console.log('Authenticated');
                    // Respond with HTTP 200 OK and Token
                    console.log("200 OK");
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            message: 'Authentication Successful',
                            token: cognitoToken
                         })
                     }
                }
                else {
                    console.log("400 Bad Request - Body Missing");
                    response = {
                        'statusCode': 400,
                        'body': JSON.stringify({
                            message: 'Bad Request',
                         })
                     }
                }

            break;

            // Create User POST
            case '/auth/user':
                // Check for Request Body
                if (event.body) {
                    // Parse, and Wait for User Creation
                    let params = JSON.parse(event.body);
                    console.log('Creating User');
                    let cognitoUser = await createUser(params.username, params.password, params.email);
                    // Respond with HTTP 201 Created
                    response = {
                        'statusCode': 201,
                        'body': JSON.stringify({
                         message: 'User Created',
                         user: cognitoUser
                         })
                    }
                }
                else {
                    console.log("400 Bad Request - Body Missing");
                    response = {
                        'statusCode': 400,
                        'body': JSON.stringify({
                         message: 'Bad Request'
                         })
                    }
                }
            break;
        }
    } catch (err) {
        console.log(err);
        return err;
    }
    return response
};