const dotenv = require('dotenv');
// Environment Variable Import
dotenv.config({ path: '.env' });

const AWS = require("aws-sdk");

const uuid = require('uuid');

// HTTP Response
let response;
let gamelift = new AWS.GameLift();

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
            // Test Game Session POST - Create Game Session
            case '/test/game/session':
                console.log('Getting GameLift Session');
                let params = {
                    MaximumPlayerSessionCount: '2', /* required */
                    //AliasId: 'STRING_VALUE',
                    //CreatorId: 'STRING_VALUE',
                    FleetId: process.env.FLEETID,
                    GameProperties: [
                        {
                            Key: 'test', /* required */
                            Value: 'STRING_VALUE' /* required */
                        },
                        /* more items */
                    ],
                    //GameSessionData: 'STRING_VALUE',
                    //GameSessionId: 'STRING_VALUE',
                    //IdempotencyToken: 'STRING_VALUE',
                    //Name: 'STRING_VALUE'
                };

                let gameSessionPromise = gamelift.createGameSession(params).promise();
                // Because AWS
                let gamesession = (await gameSessionPromise).GameSession;
                // Respond with HTTP 200 OK and Token
                console.log("200 OK");
                response = {
                    'statusCode': 200,
                    'body': JSON.stringify({
                        message: 'Session Creation Successful',
                        GameSessionId: gamesession.GameSessionId,
                        FleetId: gamesession.FleetId,
                        CreationTime: gamesession.CreationTime,
                        CurrentPlayerSessionCount: gamesession.CurrentPlayerSessionCount,
                        MaximumPlayerSessionCount: gamesession.MaximumPlayerSessionCount,
                        Status: gamesession.Status.toString(),
                        IpAddress: gamesession.IpAddress.toString(),
                        Port: gamesession.Port.toString(),
                        PlayerSessionCreationPolicy: gamesession.PlayerSessionCreationPolicy
                    })
                }

                break;
            // Test Player Session POST - Create Player Session in Game Session
            case '/test/player/session':
                if (event.body) {
                    let params = JSON.parse(event.body);
                    console.log('Creating Player Session');
                    let playerSessionPromise = gamelift.createPlayerSession({
                        GameSessionId: params.GameSessionId,
                        PlayerId: uuid.v4()
                    }).promise();
                    // Because AWS
                    let playerSession = (await playerSessionPromise).PlayerSession;

                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            message: 'PlayerSession Creation Successful',
                            PlayerSessionId: playerSession.PlayerSessionId,
                            GameSessionId: playerSession.GameSessionId,
                            FleetId: playerSession.FleetId,
                            CreationTime: playerSession.CreationTime,
                            Status: playerSession.Status,
                            IpAddress: playerSession.IpAddress,
                            Port: playerSession.Port.toString()
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