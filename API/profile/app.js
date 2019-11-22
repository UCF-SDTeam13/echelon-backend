const dotenv = require('dotenv');
// Environment Variable Import
dotenv.config({ path: '.env' });

const mysql = require('mysql2/promise');

// HTTP Response
let response;

async function getProfile(dbconnection, username) {
  const [rows, fields] = await dbconnection.execute('SELECT * FROM UserProfile WHERE userId=?;', [username]);
  console.log(fields);
  if (rows.length === 1) {
    return rows[0];
  }
  return null;
}

async function getCustomization(dbconnection, username) {
  const [rows, fields] = await dbconnection.execute('SELECT * FROM Customization WHERE userId=?;', [username]);
  console.log(fields);
  if (rows.length === 1) {
    return rows[0];
  }
  return null;
}

async function setCustomization(dbconnection, username, customizationParams) {
  await dbconnection.execute('UPDATE Customization SET characterModelId=? WHERE userId=?;', [customizationParams.characterModelId, username]);
  const [rows, fields] = await dbconnection.execute('SELECT * FROM Customization WHERE userId=?;', [username]);
  console.log(fields);
  if (rows.length === 1) {
    return rows[0];
  }
  return null;
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
  let profile;
  let customization;
  let customizationParams;

  // Set database connection parameters, pulling credentials from env
  const dbconnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DB,
  });
  try {
    // Log Event
    console.log(event);
    // Log Context
    console.log(context);
    switch (event.resource) {
      // GET Profile
      case '/profile':
        console.log('Getting Profile');
        // Parse and Wait for Authentication
        profile = await getProfile(dbconnection, event.requestContext.authorizer.claims['cognito:username']);
        if (profile != null) {
          console.log('Profile Found');
          // Respond with HTTP 200 OK and Token
          console.log('200 OK');
          response = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Profile Found',
              userId: profile.userId,
              email: profile.email,
              subscription: profile.subscription,
              points: profile.points,
            }),
          };
        } else {
          console.log('Profile Not Found');
          // Respond with HTTP 200 OK and Token
          console.log('404 NOT FOUND');
          response = {
            statusCode: 404,
            body: JSON.stringify({
              message: 'Profile Not Found',
            }),
          };
        }
        break;
      // GET Profile Customization
      case '/profile/customization':
        switch (event.httpMethod) {
          case 'GET':
            console.log('Getting Customization');
            customization = await getCustomization(dbconnection, event.requestContext.authorizer.claims['cognito:username']);
            if (customization != null) {
              console.log('Customization Found');
              // Respond with HTTP 200 OK and Token
              console.log('200 OK');
              response = {
                statusCode: 200,
                body: JSON.stringify({
                  message: 'Customization Found',
                  userId: customization.userId,
                  characterModelId: customization.characterModelId,
                }),
              };
            } else {
              console.log('Customization Not Found');
              // Respond with HTTP 200 OK and Token
              console.log('404 NOT FOUND');
              response = {
                statusCode: 404,
                body: JSON.stringify({
                  message: 'Customization Not Found',
                }),
              };
            }
            break;
          case 'PUT':
            if (event.body) {
              customizationParams = JSON.parse(event.body);
              console.log('Setting Customization');
              customization = await setCustomization(dbconnection, event.requestContext.authorizer.claims['cognito:username'], customizationParams);
              if (customization != null) {
                console.log('Customization Set');
                // Respond with HTTP 200 OK and Token
                console.log('200 OK');
                response = {
                  statusCode: 200,
                  body: JSON.stringify({
                    message: 'Customization Set',
                    userId: customization.userId,
                    characterModelId: customization.characterModelId,
                  }),
                };
              } else {
                console.log('Customization Not Found');
                // Respond with HTTP 200 OK and Token
                console.log('404 NOT FOUND');
                response = {
                  statusCode: 404,
                  body: JSON.stringify({
                    message: 'Customization Not Found',
                  }),
                };
              }
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
            console.log(`Unknown Method  ${event.httpMethod}`);
            break;
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
