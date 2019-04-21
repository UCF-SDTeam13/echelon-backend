/**
 * @fileOverview Lambda to handle API requests regarding health profile data
 */

const dotenv = require('dotenv');
// Environment Variable Import
dotenv.config({ path: '.env' });

const mysql = require('mysql');

/**
 * Get a health profile
 * @param {string} userID userID of health profile to get
 * @param {Object} dbconnection MySQL connection to database
 * @param {function} callback handler callback function
 */
function getHealthProfile(userID, dbconnection, callback) {
  // Check for userID
  if (userID == null) {
    callback(new Error('Error: Missing userID'));
    return;
  }
  // Find user and send to callback
  dbconnection.query('SELECT * FROM HealthProfile WHERE userID = ?;', userID, (error, results) => {
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
 * Set health profile fields
 * @param {string} userID userID of health profile to get
 * @param {Object} dbconnection MySQL connection to database
 * @param {function} callback handler callback function
 */
function setHealthProfile(userID, bodyjson, dbconnection, callback) {
  // Check for userID
  if (userID == null) {
    callback(new Error('Error: Missing userID'));
    return;
  }
  // Check userID is valid first
  dbconnection.query('SELECT * FROM HealthProfile WHERE userID = ?;', userID, (error, results) => {
    if (error) {
      callback(error);
      return;
    }
    if (results.length !== 1) {
      callback(new Error('Error: Invalid userID'));
    }
  });
  // Check for all parameters and update
  if (bodyjson.sex && bodyjson.birthday && bodyjson.height && bodyjson.weight) {
    dbconnection.query('UPDATE HealthProfile SET sex = ?, birthday = ?, height = ?, weight = ? WHERE userID = ?;',
      [bodyjson.sex, bodyjson.birthday, bodyjson.height, bodyjson.weight, userID], (error) => {
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
      getHealthProfile(event.params.querystring.userID, dbconnection, callback);
      break;
    case 'PUT':
      setHealthProfile(event.params.querystring.userID, event['body-json'],
        dbconnection, callback);
      break;
    default:
      callback(new Error('Error: Unsupported Method'));
      break;
  }
  // Disconnect from database to allow lambda to terminate
  dbconnection.end();
};
