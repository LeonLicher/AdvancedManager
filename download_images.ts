import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const baseUrl = 'https://kickbase.b-cdn.net/pool/playersbig/';
const outputDir = path.join(process.cwd(), 'public', 'player-images');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to download an image for a single player
function downloadPlayerImage(playerId: string): Promise<string | null> {
  const url = `${baseUrl}${playerId}.png`;
  const filePath = path.join(outputDir, `${playerId}.png`);

  return new Promise((resolve) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(filePath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded: ${playerId}.png`);
          resolve(`/player-images/${playerId}.png`);
        });
      } else {
        console.log(`Failed to download: ${playerId}.png`);
        resolve(null);
      }
    }).on('error', (err) => {
      console.error(`Error downloading ${playerId}.png:`, err.message);
      resolve(null);
    });
  });
}

// Function to download images for an array of player IDs
async function downloadPlayerImages(playerIds: string[]): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};

  for (const playerId of playerIds) {
    results[playerId] = await downloadPlayerImage(playerId);
  }

  console.log('All downloads completed');
  return results;
}

// New function to download images based on a comma-separated string of player IDs
export async function downloadImagesFromString(playerIdsString: string) {
  const playerIds = playerIdsString.split(',').map(id => id.trim());
  const imageUrls = await downloadPlayerImages(playerIds);
  console.log('Downloaded image URLs:', imageUrls);
  return imageUrls;
}

// Main function to run the script
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a comma-separated string of player IDs as an argument.');
    process.exit(1);
  }

  const playerIdsString = args[0];
  await downloadImagesFromString(playerIdsString);

  // Scan the directory and create the JSON file
  const outputPath = path.join(outputDir, 'players.json');

  fs.readdir(outputDir, (err, files) => {
    if (err) {
      return console.error('Unable to scan directory:', err);
    }
    const playerIds = files
      .filter(file => file.endsWith('.png'))
      .map(file => file.replace('.png', ''));

    fs.writeFile(outputPath, JSON.stringify(playerIds, null, 2), (err) => {
      if (err) {
        return console.error('Error writing JSON file:', err);
      }
      console.log('Player IDs JSON file has been saved.');
    });
  });
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}