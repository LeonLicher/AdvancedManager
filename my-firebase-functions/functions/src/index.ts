const functions = require('firebase-functions');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.runPythonScript = functions.https.onRequest((request, response) => {
    exec('python3 /path/to/your/script/getDetailedPlayers.py', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return response.status(500).send(`Error: ${error.message}`);
        }

        // Move the created file to the /public directory
        const sourceFilePath = '/path/to/your/script/detailed_players.json';
        const destinationFilePath = path.join(__dirname, '../public/detailed_players.json');

        fs.rename(sourceFilePath, destinationFilePath, (err) => {
            if (err) {
                console.error(`Error moving file: ${err}`);
                return response.status(500).send(`Error moving file: ${err.message}`);
            }
            response.send(`Output: ${stdout} - File moved to /public`);
        });
    });
});