// Minimal Working Realtime Script

// Example override configuration
const configuration = {
  pingIntervalTime: 30000,
};

// Timing mechanism used to trigger end of game session. Defines how long, in milliseconds, between each tick in the example tick loop
const tickTime = 1000;

// Defines how to long to wait in Seconds before beginning early termination check in the example tick loop
const minimumElapsedTime = 120;

let session; // The Realtime server session object
let logger; // Log at appropriate level via .info(), .warn(), .error(), .debug()
let startTime; // Records the time the process started
let activePlayers = 0; // Records the number of connected players
let onProcessStartedCalled = false; // Record if onProcessStarted has been called

// Example custom op codes for user-defined messages
// Any positive op code number can be defined here. These should match your client code.
const OP_CODE_CUSTOM_OP1 = 111;
const OP_CODE_CUSTOM_OP1_REPLY = 112;
const OP_CODE_PLAYER_ACCEPTED = 113;
const OP_CODE_DISCONNECT_NOTIFICATION = 114;

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
  onProcessStartedCalled = true;
  logger.info(`onProcessStarted: ${args}`);
  return true;
}

// Called when a new game session is started on the process
function onStartGameSession(gameSession) {
  logger.info(`onStartGameSession: ${gameSession}`);
  // Complete any game session set-up

  // Set up an example tick loop to perform server initiated actions
  startTime = getTimeInS();
  tickLoop();
}

// Handle process termination if the process is being terminated by GameLift
// You do not need to call ProcessEnding here
function onProcessTerminate() {
  // Perform any clean up
}

// Return true if the process is healthy
function onHealthCheck() {
  return true;
}

// On Player Connect is called when a player has passed initial validation
// Return true if player should connect, false to reject
function onPlayerConnect(connectMsg) {
  // Perform any validation needed for connectMsg.payload, connectMsg.peerId
  logger.info(`onPlayerConect: ${connectMsg}`);
  return true;
}

// Called when a Player is accepted into the game
function onPlayerAccepted(player) {
  // This player was accepted -- let's send them a message
  logger.info(`onPlayerAccepted: ${player}`);
  const msg = session.newTextGameMessage(OP_CODE_PLAYER_ACCEPTED, player.peerId,
    `Peer ${player.peerId} accepted`);
  session.sendReliableMessage(msg, player.peerId);
  activePlayers += 1;
}

// On Player Disconnect is called when a player has left or been forcibly terminated
// Is only called for players that actually connected to the server and not those rejected by validation
// This is called before the player is removed from the player list
function onPlayerDisconnect(peerId) {
  logger.info(`onPlayerDiconnect: ${peerId}`);
}

// Handle a message to the server
function onMessage(gameMessage) {
  logger.info(`onMessage: ${gameMessage}`);
}

// Return true if the send should be allowed
function onSendToPlayer(gameMessage) {
  // This example rejects any payloads containing "Reject"
  return true;
}

// Return true if the send to group should be allowed
// Use gameMessage.getPayloadAsText() to get the message contents
function onSendToGroup(gameMessage) {
  return true;
}

// Return true if the player is allowed to join the group
function onPlayerJoinGroup(groupId, peerId) {
  return true;
}

// Return true if the player is allowed to leave the group
function onPlayerLeaveGroup(groupId, peerId) {
  return true;
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
  } else {
    setTimeout(tickLoop, tickTime);
  }
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
  onSendToGroup,
  onPlayerJoinGroup,
  onPlayerLeaveGroup,
  onStartGameSession,
  onProcessTerminate,
  onHealthCheck,
};
