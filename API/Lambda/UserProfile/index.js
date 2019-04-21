/**
 * @fileOverview Lambda to handle API requests regarding user profile data
 */

const dotenv = require('dotenv');
// Environment Variable Import
dotenv.config({ path: '.env' });

const mysql = require('mysql');

/**
 * Get a user profile
 * @param {string} userID userID of user profile to get
 * @param {Object} dbconnection MySQL connection to database
 * @param {function} callback handler callback function
 */
function getUserProfile(userID, dbconnection, callback) {
  // Check for userID
  if (userID == null) {
    callback(new Error('Error: Missing userID'));
    return;
  }
  // Find user and send to callback
  dbconnection.query('SELECT * FROM UserProfile WHERE userID = ?;', userID, (error, results) => {
    if (error) {
      callback(error);
      return;
    }
    if (results.length === 1) {
      callback(null, results[0]);
    } else {
      callback(new Error('Error: Invalid userID'));
    }
  });
}

/**
 * Set user profile fields
 * @param {string} userID userID of user profile to get
 * @param {Object} dbconnection MySQL connection to database
 * @param {function} callback handler callback function
 */
function setUserProfile(userID, bodyjson, dbconnection, callback) {
  // Check for userID
  if (userID == null) {
    callback(new Error('Error: Missing userID'));
    return;
  }
  // Check userID is valid first
  dbconnection.query('SELECT * FROM UserProfile WHERE userID = ?;', userID, (error, results) => {
    if (error) {
      callback(error);
      return;
    }
    if (results.length !== 1) {
      callback(new Error('Error: Invalid userID'));
    }
  });
  // Check for all parameters and update
  if (bodyjson.firstName && bodyjson.lastName && bodyjson.email) {
    dbconnection.query('UPDATE UserProfile SET firstName = ?, lastName = ?, email = ? WHERE userID = ?;',
      [bodyjson.firstName, bodyjson.lastName, bodyjson.email, userID], (error) => {
        if (error) {
          callback(error);
        } else {
          callback(null, 'Success');
        }
      });
  } else {
    callback(new Error('Error: Missing parameters'));
  }
}

exports.handler = (event, context, callback) => {
  // Set database connection parameters, pulling credentials from env
  const dbconnection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DB,
  });
  // Connect to database
  dbconnection.connect((err) => {
    if (err) {
      callback(err);
    }
  });
  // Determine HTTP method and route accordingly
  switch (event.context['http-method']) {
    case 'GET':
      getUserProfile(event.params.querystring.userID, dbconnection, callback);
      break;
    case 'PUT':
      setUserProfile(event.params.querystring.userID, event['body-json'],
        dbconnection, callback);
      break;
    default:
      callback(new Error('Error: Unsupported Method'));
      break;
  }
  // Disconnect from database to allow lambda to terminate
  dbconnection.end();
};
