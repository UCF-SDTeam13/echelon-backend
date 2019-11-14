const dotenv = require('dotenv');
// Environment Variable Import
dotenv.config({ path: '.env' });

const AWS = require('aws-sdk');

const uuid = require('uuid');

const gamelift = new AWS.GameLift();

async function createGameSession(gameParams) {
  const paramsSearch = {
    // FleetId: process.env.FLEETID,
    AliasId: process.env.ALIASID,
  };
  let gameSession;
  // Get Existing Game Sessions
  const sessionPromise = gamelift.searchGameSessions(paramsSearch).promise();
  const sessions = (await sessionPromise).GameSessions;
  console.log(sessions);
  // If Game Sessions Already Exist - Use The First Available
  if (sessions.length >= 1) {
    // Equivalent to gameSession = sessions[0];
    [gameSession] = sessions;
  } else {
    // Otherwise - Create a New Game Session
    const gameSessionPromise = gamelift.createGameSession(gameParams).promise();
    // Because AWS
    gameSession = (await gameSessionPromise).GameSession;
  }

  return gameSession;
}

async function createPlayerSession(playerParams) {
  const playerSessionPromise = gamelift.createPlayerSession({
    GameSessionId: playerParams.GameSessionId,
    PlayerId: uuid.v4(),
  }).promise();
  return (await playerSessionPromise).PlayerSession;
}

async function startGameSessionPlacement() {
  const sessionParams = {
    GameSessionQueueName: 'echelonAliasQueue',
    MaximumPlayerSessionCount: 8,
    PlacementId: uuid.v4(),
  };

  const placementPromise = gamelift.startGameSessionPlacement(sessionParams).promise();
  const placement = (await placementPromise).GameSessionPlacement;
  return placement;
}

async function describeGameSessionPlacement(sessionParams) {
  const placementPromise = gamelift.describeGameSessionPlacement(sessionParams).promise();
  const placement = (await placementPromise).GameSessionPlacement;
  return placement;
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
  // HTTP Response
  let response;
  const gameParams = {
    MaximumPlayerSessionCount: '8', /* required */
    AliasId: process.env.ALIASID,
    // CreatorId: 'STRING_VALUE',
    // FleetId: process.env.FLEETID,
    // GameProperties: [
    //  {
    //    Key: 'test', /* required */
    //    Value: 'STRING_VALUE', /* required */
    //  },
    // ],
    // GameSessionData: 'STRING_VALUE',
    // GameSessionId: 'STRING_VALUE',
    // IdempotencyToken: 'STRING_VALUE',
    // Name: 'STRING_VALUE'
  };

  try {
    // Log Event
    console.log(event);
    // Log Console
    console.log(context);
    let gameSession;
    let playerSession;
    let playerParams;
    let placementParams;
    switch (event.resource) {
      // Test Game Session POST - Create Game Session
      case '/test/game/session':
        console.log('Getting GameLift Session');

        gameSession = await createGameSession(gameParams);
        console.log(gameSession);

        // Respond with HTTP 200 OK and Token
        console.log('200 OK');
        response = {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Session Creation Successful',
            GameSessionId: gameSession.GameSessionId,
            FleetId: gameSession.FleetId,
            CreationTime: gameSession.CreationTime,
            CurrentPlayerSessionCount: gameSession.CurrentPlayerSessionCount,
            MaximumPlayerSessionCount: gameSession.MaximumPlayerSessionCount,
            Status: gameSession.Status,
            IpAddress: gameSession.IpAddress.toString(),
            Port: gameSession.Port.toString(),
            PlayerSessionCreationPolicy: gameSession.PlayerSessionCreationPolicy,
          }),
        };
        break;
      case '/test/gamequeue/session':
        console.log('Placing GameLift Session');

        gameSession = await startGameSessionPlacement();
        console.log(gameSession);

        // Respond with HTTP 200 OK and Token
        console.log('200 OK');
        response = {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Session Placement Queued Successful',
            PlacementId: gameSession.PlacementId,
            GameSessionQueueName: gameSession.GameSessionQueueName,
            MaximumPlayerSessionCount: gameSession.MaximumPlayerSessionCount,
            GameSessionName: gameSession.GameSessionName,
            GameSessionArn: gameSession.GameSessionArn,
            Status: gameSession.Status,
            // IpAddress: gameSession.IpAddress.toString(),
            // Port: gameSession.Port.toString(),
            GameSessionData: gameSession.GameSessionData,
          }),
        };
        break;
      case '/test/gamequeue/session/status':
        if (event.body) {
          placementParams = JSON.parse(event.body);
          console.log('Getting Status of GameLift Placement');

          gameSession = await describeGameSessionPlacement(placementParams);
          console.log(gameSession);

          // Respond with HTTP 200 OK and Token
          console.log('200 OK');
          response = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Session Placement Queued Successful',
              PlacementId: gameSession.PlacementId,
              GameSessionQueueName: gameSession.GameSessionQueueName,
              MaximumPlayerSessionCount: gameSession.MaximumPlayerSessionCount,
              GameSessionName: gameSession.GameSessionName,
              GameSessionArn: gameSession.GameSessionArn,
              Status: gameSession.Status,
              // IpAddress: gameSession.IpAddress.toString(),
              // Port: gameSession.Port.toString(),
              GameSessionData: gameSession.GameSessionData,
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
      // Test Player Session POST - Create Player Session in Game Session
      case '/test/player/session':
        if (event.body) {
          playerParams = JSON.parse(event.body);
          console.log('Creating Player Session');
          playerSession = await createPlayerSession(playerParams);

          response = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'PlayerSession Creation Successful',
              PlayerSessionId: playerSession.PlayerSessionId,
              GameSessionId: playerSession.GameSessionId,
              FleetId: playerSession.FleetId,
              CreationTime: playerSession.CreationTime,
              Status: playerSession.Status,
              IpAddress: playerSession.IpAddress,
              Port: playerSession.Port.toString(),
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
        // Unknown Resource
        console.log(`Unknown Resource: ${event.resource}`);
        break;
    }
  } catch (err) {
    console.log(err);
    return err;
  }
  return response;
};
