DROP DATABASE  IF EXISTS echelonDatabase;
CREATE DATABASE echelonDatabase;
USE echelonDatabase;

CREATE TABLE UserProfile
(
    userId VARCHAR(128) PRIMARY KEY,
    email VARCHAR(64) NOT NULL,
    subscription BOOL NOT NULL,
    points INT NOT NULL
);

CREATE TABLE Customization
(
    userId VARCHAR(128) PRIMARY KEY,
    characterModelId VARCHAR(16) NOT NULL
);

CREATE TABLE SessionSummary
(
    userId VARCHAR(128) NOT NULL,
    sessionId VARCHAR(128) NOT NULL,
    sessionDuration INT NOT NULL,
    sessionTime DATETIME NOT NULL,
    avgRPM DOUBLE NOT NULL,
    avgSpeed DOUBLE NOT NULL,
    sessionDistance DOUBLE NOT NULL,
    PRIMARY KEY (userId, sessionId)
);

CREATE TABLE Achievements
(
    achievementId VARCHAR(128) PRIMARY KEY,
    pointValue INT NOT NULL
);

CREATE TABLE UserAchievements
(
    userId VARCHAR(128),
    achievementId VARCHAR(128),
    achievedTime DATETIME NOT NULL,
    PRIMARY KEY (userId, achievementId)
);