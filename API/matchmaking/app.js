const dotenv = require('dotenv');
// Environment Variable Import
dotenv.config({ path: '.env' });

const AWS = require('aws-sdk');

const uuid = require('uuid');

const gamelift = new AWS.GameLift();

async function startMatchmaking(playerParams) {
  console.log(playerParams);
  const matchParams = {
    ConfigurationName: 'EchelonMatchmaker',
    Players: [
      {
        PlayerId: uuid.v4(),
        PlayerAttributes: {

        },
        Team: 'Echelon',
        LatencyInMs: {
          'us-east-1': '1',
          'us-east-2': '1',
        },
      },
    ],
  };
  // Otherwise - Create a New Game Session
  const ticketPromise = gamelift.startMatchmaking(matchParams).promise();
  // Because AWS
  const ticket = (await ticketPromise).MatchmakingTicket;

  return ticket;
}

async function describeMatchmaking(ticketId) {
  const ticketParams = {
    TicketIds: [ticketId],
  };
  const ticketListPromise = gamelift.describeMatchmaking(ticketParams).promise();
  const ticket = (await ticketListPromise).TicketList[0];
  return ticket;
}

async function acceptMatch(matchParams) {
  const matchParams2 = {
    TicketId: matchParams.TicketId,
    PlayerIds: [matchParams.PlayerId],
    AcceptanceType: 'ACCEPT',
  };
  const acceptPromise = gamelift.acceptMatch(matchParams2).promise();
  const acceptResponse = (await acceptPromise);
  return acceptResponse;
}

async function stopMatchmaking(playerParams) {
  const playerSessionPromise = gamelift.createPlayerSession({
    GameSessionId: playerParams.GameSessionId,
    PlayerId: uuid.v4(),
  }).promise();
  return (await playerSessionPromise).PlayerSession;
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

  try {
    // Log Event
    console.log(event);
    // Log Console
    console.log(context);
    let ticket;
    let ticketParams;
    let acceptResponse;
    let acceptParams;
    let playerSession;
    let playerParams;
    switch (event.resource) {
      // Test Game Session POST - Create Game Session
      case '/matchmaking/ticket':
        switch (event.httpMethod) {
          case 'POST':
            if (event.body) {
              playerParams = JSON.parse(event.body);
              console.log('Starting Matchmaking');
              ticket = await startMatchmaking(playerParams);
              console.log(ticket);

              // Respond with HTTP 200 OK and Token
              console.log('200 OK');
              response = {
                statusCode: 200,
                body: JSON.stringify({
                  message: 'Ticket Creation Successful',
                  TicketId: ticket.TicketId,
                  Status: ticket.Status,
                  StatusReason: ticket.StatusReason,
                  StatusMessage: ticket.StatusMessage,
                  StartTime: ticket.StartTime,
                  PlayerId: ticket.Players[0].PlayerId,
                  EstimatedWaitTime: ticket.EstimatedWaitTime,
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
          case 'DELETE':
            if (event.body) {
              playerParams = JSON.parse(event.body);
              console.log('Creating Player Session');
              playerSession = await stopMatchmaking(playerParams);

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
            console.log(`Unsupported Method: ${event.httpMethod}`);
            break;
        }
        break;
      case '/matchmaking/status':
        if (event.body) {
          ticketParams = JSON.parse(event.body);
          console.log('Describe Matchmaking Ticket');
          ticket = await describeMatchmaking(ticketParams.TicketId);
          console.log(ticket);

          // Respond with HTTP 200 OK and Token
          console.log('200 OK');
          response = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Ticket Status Retrieved',
              Ticket: ticket,
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
      case '/matchmaking/match':
        if (event.body) {
          acceptParams = JSON.parse(event.body);
          console.log('Accepting Match');
          acceptResponse = await acceptMatch(acceptParams);
          console.log(ticket);

          // Respond with HTTP 200 OK and Token
          console.log('200 OK');
          response = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Match Acceptance Successful',
              match: acceptResponse,
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
