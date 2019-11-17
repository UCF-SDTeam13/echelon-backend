DROP DATABASE  IF EXISTS echelonDatabase;
CREATE DATABASE echelonDatabase;
USE echelonDatabase;

CREATE TABLE UserProfile
(
    userID VARCHAR(128) PRIMARY KEY,
    email VARCHAR(64) NOT NULL,
    subscription BOOL NOT NULL,
    points INT NOT NULL
);

CREATE TABLE Customization
(
    userID VARCHAR(128) PRIMARY KEY,
    characterModelID VARCHAR(16) NOT NULL
);

CREATE TABLE SessionSummary
(
    userID VARCHAR(128) NOT NULL,
    sessionID VARCHAR(128) NOT NULL,
    sessionDuration INT NOT NULL,
    sessionTime DATETIME NOT NULL,
    avgRPM DOUBLE NOT NULL,
    avgSpeed DOUBLE NOT NULL,
    sessionDistance DOUBLE NOT NULL,
    PRIMARY KEY (userID, sessionID)
);

CREATE TABLE Achievements
(
    achievementID VARCHAR(128) PRIMARY KEY,
    pointValue INT NOT NULL
);

CREATE TABLE UserAchievements
(
    userID VARCHAR(128),
    achievementID VARCHAR(128),
    achievedTime DATETIME NOT NULL,
    PRIMARY KEY (userID, achievementID)
);