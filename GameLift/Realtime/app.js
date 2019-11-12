const configuration = {
  // pingIntervalTime: 3000,
  maxPlayers: 8,
};

// Number of Ticks Per Second, in Hz
const ticksPerSecond = 1;
// Length of a Tick, in Milliseconds
const tickLength = (1 / ticksPerSecond) * 1000;
// Empty Server Timeout, in Milliseconds
const emptyTimeout = 1 * 60 * 1000;
// Realtime Server Session
let rtSession;
// Logger for Session
let logger;
// Start Time of Current Game Session
let sessionStartTime;
// Session Total Elapsed Time
let sessionElapsedTime;
// Start Time of Current Tick
let tickStartTime;
// End time of Current Tick
let tickEndTime;
// Start Time of Last Tick
let lastTickStartTime;
// Delta Time Since Last Tick
let deltaTime;
// Number of Active Players
let numActivePlayers;
// Current Game State
let state;
// Realtime Server Initalization
function init(rSession) {
  rtSession = rSession;
  logger = rtSession.getLogger();
}

// Gets the Current Time in Milliseconds
function getTime() {
  return (new Date()).getTime();
}

function onHealthCheck() {
  return true;
}

function onPlayerConnect(connectMsg) {
  return true;
}

function onPlayerAccepted(player) {
  numActivePlayers += 1;
}

function onPlayerDisconnect(player) {
  numActivePlayers -= 1;
}

// Message Received Callback
function onMessage() {

}

function onSendToPlayer(gameMessage) {
  return true;
}

function onSendToGroup(gameMessage) {
  return true;
}

function onPlayerJoinGroup(groupId, peerId) {
  return true;
}

function onPlayerLeaveGroup(groupId, peerId) {
  return true;
}

function onProcessStarted(args) {
  logger.info(`Starting Process with Arguments: ${args}`);
  numActivePlayers = 0;
  logger.info('Ready to Host');
  return true;
}

function onProcessTerminate() {

}

// Game Loop - Called Every Tick
async function tickGameLoop() {
  if (state === 'ACTIVE') {
    // Start Tick
    tickStartTime = getTime();
    deltaTime = tickStartTime - lastTickStartTime;
    sessionElapsedTime += deltaTime;

    if (sessionElapsedTime > emptyTimeout && numActivePlayers === 0) {
      state = 'EMPTY';
    }

    // End of Tick
    lastTickStartTime = tickStartTime;
    tickEndTime = getTime();
    deltaTime = (tickEndTime - tickStartTime);
    const nextTickTime = tickLength - deltaTime > 0 ? tickLength - deltaTime : 0;
    // Schedule Next Tick
    setTimeout(tickGameLoop, nextTickTime);
  } else {
    state = 'ENDING';
    logger.info('Process Ending');
    const result = await sessionStartTime.processEnding();
    logger.info(`Process Ending Outcome: ${result}`);
    state = 'ENDED';
    process.exit(0);
  }
}

function onStartGameSession(gameSession) {
  sessionStartTime = getTime();
  lastTickStartTime = sessionStartTime;
  sessionElapsedTime = 0;
  deltaTime = 0;

  state = 'ACTIVE';
  // Start Ticking Game Loop
  tickGameLoop();
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
