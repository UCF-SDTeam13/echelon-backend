// Example Realtime Server Scri// Example override configuration
const configuration = {
  pingIntervalTime: 30000,
};

// Timing mechanism used to trigger end of game session.
// Defines how long, in milliseconds, between each tick in the example tick loop
const tickTime = 1000;

// Defines how to long to wait in seconds before beginning
// early termination check in the example tick loop
const minimumElapsedTime = 90;
let session; // The Realtime server session object
let logger; // Log at appropriate level via .info(), .warn(), .error(), .debug()
let startTime; // Records the time the process started
let activePlayers = 0; // Records the number of connected players
let timeTillTerminate = 3 * 60;
const log = [];

// Example custom op codes for user-defined messages
// Any positive op code number can be defined here. These should match your client code.
const OP_CODE_PLAYER_ACCEPTED = 113;
const OP_CODE_PLAYER_DISCONNECTED = 114;
const OP_CODE_RACE_START = 115;
const OP_CODE_RACE_END = 116;
const OP_CODE_TIME_TILL_TERMINATE = 117;
const OP_CODE_STATS_UPDATE = 118;
const OP_CODE_CUSTOMIZATION_UPDATE = 119;
const OP_CODE_PLAYERS_CONNECTED = 120;

// Called when game server is initialized, passed server's object of current session
function init(rtSession) {
  session = rtSession;
  logger = session.getLogger();
}

// Calculates the current time in seconds
function getTimeInS() {
  return Math.round(new Date().getTime() / 1000);
}

// On Process Started is called when the process has begun and we need to perform any
// bootstrapping.  This is where the developer should insert any code to prepare
// the process to be able to host a game session, for example load some settings or set state
//
// Return true if the process has been appropriately prepared and it is okay to invoke the
// GameLift ProcessReady() call.
function onProcessStarted(args) {
  logger.info(`Starting process with args:  ${args}`);
  logger.info('Ready to host games...');

  return true;
}

// Handle process termination if the process is being terminated by GameLift
// You do not need to call ProcessEnding here
function onProcessTerminate() {
  // Perform any clean up
  const outMessage = session.newTextGameMessage(OP_CODE_RACE_END, session.getServerId(), 'Race Ending');
  // eslint-disable-next-line no-unused-vars
  session.getPlayers().forEach((player, playerId) => {
    session.sendReliableMessage(outMessage, player);
  });
  logger.info('Ending Game Session');
}

// Return true if the process is healthy
function onHealthCheck() {
  return true;
}

// On Player Connect is called when a player has passed initial validation
// Return true if player should connect, false to reject
function onPlayerConnect(connectMsg) {
  logger.info(`ConnectMSG Information: ${connectMsg}`);
  // Perform any validation needed for connectMsg.payload, connectMsg.peerId
  if (activePlayers >= 8) { return false; }

  return true;
}

// Called when a Player is accepted into the game
function onPlayerAccepted(player) {
  logger.info(`Player ${player.peerId} accepted`);
  // This player was accepted -- let's send them a message
  const msg = session.newTextGameMessage(OP_CODE_PLAYER_ACCEPTED, player.peerId,
    `Player ${player.peerId} accepted`);

  log.forEach((element) => {
    const customizationLog = session.newTextGameMessage(OP_CODE_CUSTOMIZATION_UPDATE,
      element.peerId, element.customizationModel);
    session.sendReliableMessage(customizationLog, player.peerId);
  });

  session.sendReliableMessage(msg, player.peerId);
  activePlayers += 1;
}

// On Player Disconnect is called when a player has left or been forcibly terminated
// Is only called for players that actually connected to the server and not those rejected by
// validation. This is called before the player is removed from the player list
function onPlayerDisconnect(peerId) {
  logger.info(`Player ${peerId} disconnected`);

  // send a message to each remaining player letting them know about the disconnect
  const outMessage = session.newTextGameMessage(OP_CODE_PLAYER_DISCONNECTED,
    peerId, `Player ${peerId} disconnected`);

  session.getPlayers().forEach((player, playerId) => {
    if (playerId !== peerId) {
      session.sendReliableMessage(outMessage, playerId);
    }
  });
  activePlayers -= 1;
}

// Handle a message to the server
function onMessage(gameMessage) {
  switch (gameMessage.opCode) {
    case OP_CODE_RACE_START:
    {
      const outMessage = session.newTextGameMessage(OP_CODE_RACE_START, session.getServerId(), 'Race Starting');
      // eslint-disable-next-line no-unused-vars
      session.getPlayers().forEach((player, playerId) => {
        session.sendReliableMessage(outMessage, playerId);
      });
      logger.info('Starting Game');
      break;
    }

    case OP_CODE_TIME_TILL_TERMINATE:
    {
      // Adding a minute for termination time to allow players to leave.
      // If 15 min game, then 16 mins till server terminates
      timeTillTerminate = (gameMessage.payload + 3) * 1000 * 60;
      break;
    }

    case OP_CODE_STATS_UPDATE:
    {
      const outMessage = session.newTextGameMessage(OP_CODE_STATS_UPDATE,
        gameMessage.sender, gameMessage.payload);
      session.getPlayers().forEach((player, playerId) => {
        if (playerId !== gameMessage.sender) {
          session.sendReliableMessage(outMessage, playerId);
        }
      });
      break;
    }

    case OP_CODE_CUSTOMIZATION_UPDATE:
    {
      const outMessage = session.newTextGameMessage(OP_CODE_CUSTOMIZATION_UPDATE,
        gameMessage.sender, gameMessage.payload);
      session.getPlayers().forEach((player, playerId) => {
        if (playerId !== gameMessage.sender) {
          session.sendReliableMessage(outMessage, playerId);
        }
      });


      log.push(
        {
          peerId: gameMessage.sender,
          customizationModel: gameMessage.payload,
        },
      );

      break;
    }
    default:
      logger.info('OP CODE not found');
      break;
  }
}

// Return true if the send should be allowed
function onSendToPlayer(gameMessage) {
  // This example rejects any payloads containing "Reject"
  return (!gameMessage.getPayloadAsText().includes('Reject'));
}

// A simple tick loop example
// Checks to see if a minimum amount of time has passed before seeing if the game has ended
async function tickLoop() {
  const elapsedTime = getTimeInS() - startTime;
  logger.info(`Tick... ${elapsedTime} activePlayers: ${activePlayers}`);

  // In Tick loop - see if all players have left early after a minimum period of time has passed
  // Call processEnding() to terminate the process and quit
  if ((activePlayers === 0) && (elapsedTime > minimumElapsedTime)) {
    logger.info('All players disconnected. Ending game');
    const outcome = await session.processEnding();
    logger.info(`Completed process ending with: ${outcome}`);
    process.exit(0);
  }

  /*
  if ((activePlayers === playerAllowed)) || elapsedTime > minimumElapsedTime))
  {
	logger.info('Signaling startGame to client')
	const outMessage = session.newTextGameMessage(OP_CODE_PLAYERS_CONNECTED, session.getServerId(), 'Players Connected');
	// eslint-disable-next-line no-unused-vars
	session.getPlayers().forEach((player, playerId) => {
		session.sendReliableMessage(outMessage, playerId);
	});
	logger.info('Starting Game');
  }
  */

  // When the servers elapse time exceeds the game time, the session is terminated
  if (elapsedTime > timeTillTerminate) {
    logger.info('Terminating game after certain time has passed');
    const outcome = await session.processEnding();
    logger.info(`Completed process ending with: ${outcome}`);
    process.exit(0);
  } else {
    setTimeout(tickLoop, tickTime);
  }
}


// Called when a new game session is started on the process
function onStartGameSession(gameSession) {
  logger.info(`GameSession Information: ${gameSession}`);
  // Complete any game session set-up

  // Set up an example tick loop to perform server initiated actions
  startTime = getTimeInS();
  tickLoop();
}

exports.ssExports = {
  configuration,
  init,
  onProcessStarted,
  onMessage,
  onPlayerConnect,
  onPlayerAccepted,
  onPlayerDisconnect,
  onSendToPlayer,
  onStartGameSession,
  onProcessTerminate,
  onHealthCheck,
};
