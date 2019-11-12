/*
* All or portions of this file Copyright (c) Amazon.com, Inc. or its affiliates or
* its licensors.
*
* All use of this software is governed by the terms and conditions governing AWS
* Content in the AWS Customer Agreement at aws.amazon.com/agreement. Do not
* remove or modify any license notices. This file is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*
*/

// Example minimal server file with no overridden callbacks or configuration

var gameSession;

// Called when game server is initialized, is passed server object of current session
function init(session) {
    gameSession = session;
}

exports.ssExports = {
    init: init
};
