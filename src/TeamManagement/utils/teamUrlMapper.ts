/**
 * Team URL mapper for ligainsider.de
 */
import { getLogger } from "./logger";

const logger = getLogger("teamUrlMapper");

/**
 * Reference table of teams with their ligainsider URLs and IDs
 *
 * Format: "team-name-slug" => "ligainsider-id"
 *
 * Examples from observed URLs:
 * - https://www.ligainsider.de/fc-bayern-muenchen/1/
 * - https://www.ligainsider.de/sv-werder-bremen/2/
 * - https://www.ligainsider.de/bayer-04-leverkusen/4/
 */
const TEAM_INFO = {
  // Team slugs and their ligainsider IDs
  "fc-bayern-muenchen": "1",
  "sv-werder-bremen": "2",
  "eintracht-frankfurt": "3",
  "bayer-04-leverkusen": "4",
  "borussia-moenchengladbach": "5",
  "vfb-stuttgart": "9",
  "borussia-dortmund": "10",
  "vfl-bochum": "11",
  "tsg-hoffenheim": "14",
  "vfl-wolfsburg": "16",
  "1-fsv-mainz-05": "17",
  "sc-freiburg": "18",
  "fc-st-pauli": "20",
  "fc-augsburg": "21",
  "1-fc-union-berlin": "40",
  "rb-leipzig": "43",
  "ksv-holstein": "51", // Holstein Kiel
  "1-fc-heidenheim": "1259",
};

/**
 * Map of team IDs in our app to their ligainsider URL paths
 * Key: Your app's teamId, Value: ligainsider URL slug
 */
const teamUrls: { [key: string]: string } = {
  "1": "fc-bayern-muenchen", // Bayern in your app
  "2": "fc-bayern-muenchen", // Also Bayern in your app (alternative ID)
  "3": "borussia-dortmund", // BVB in your app
  "4": "bayer-04-leverkusen", // Leverkusen in your app
  "5": "borussia-moenchengladbach",
  "7": "bayer-04-leverkusen", // Also Leverkusen in your app (alternative ID)
  "9": "vfb-stuttgart",
  "10": "sv-werder-bremen", // Werder Bremen in your app
  "11": "vfl-bochum",
  "12": "vfb-stuttgart", // Also Stuttgart in your app (alternative ID)
  "14": "tsg-hoffenheim", // Hoffenheim in your app
  "16": "vfl-wolfsburg",
  "17": "1-fsv-mainz-05",
  "18": "1-fc-heidenheim", // Heidenheim in your app
  "20": "fc-st-pauli",
  "21": "fc-augsburg",
  "24": "vfl-bochum", // Also Bochum in your app (alternative ID)
  "40": "1-fc-union-berlin",
  "43": "rb-leipzig", // Leipzig in your app
  "50": "ksv-holstein", // Alternative ID for Holstein Kiel in your app
  "51": "ksv-holstein", // Holstein Kiel in your app
  "1246": "1-fc-union-berlin", // Also Union Berlin in your app (alternative ID)
  "1259": "1-fc-heidenheim", // Also Heidenheim in your app (alternative ID)
  "1295": "ksv-holstein", // Also Holstein Kiel in your app (alternative ID)
  "1311": "rb-leipzig", // Also Leipzig in your app (alternative ID)
};

/**
 * Map team IDs in our system to ligainsider's IDs
 * This directly maps from your app's team ID to ligainsider's ID
 */
const ligainsiderTeamIds: { [key: string]: string } = {
  "1": TEAM_INFO["fc-bayern-muenchen"], // Bayern -> ligainsider ID 1
  "2": TEAM_INFO["fc-bayern-muenchen"], // Bayern -> ligainsider ID 1
  "3": TEAM_INFO["borussia-dortmund"], // BVB -> ligainsider ID 10
  "4": TEAM_INFO["bayer-04-leverkusen"], // Leverkusen -> ligainsider ID 4
  "5": TEAM_INFO["borussia-moenchengladbach"],
  "7": TEAM_INFO["bayer-04-leverkusen"], // Leverkusen -> ligainsider ID 4
  "9": TEAM_INFO["vfb-stuttgart"], // Stuttgart -> ligainsider ID 9
  "10": TEAM_INFO["sv-werder-bremen"], // Bremen -> ligainsider ID 2
  "11": TEAM_INFO["vfl-bochum"],
  "12": TEAM_INFO["vfb-stuttgart"], // Stuttgart -> ligainsider ID 9
  "14": TEAM_INFO["tsg-hoffenheim"], // Hoffenheim -> ligainsider ID 14
  "16": TEAM_INFO["vfl-wolfsburg"],
  "17": TEAM_INFO["1-fsv-mainz-05"],
  "18": TEAM_INFO["1-fc-heidenheim"], // Heidenheim -> ligainsider ID 1259
  "20": TEAM_INFO["fc-st-pauli"],
  "21": TEAM_INFO["fc-augsburg"],
  "24": TEAM_INFO["vfl-bochum"],
  "40": TEAM_INFO["1-fc-union-berlin"],
  "43": TEAM_INFO["rb-leipzig"], // Leipzig -> ligainsider ID 43
  "50": TEAM_INFO["ksv-holstein"], // Holstein Kiel -> ligainsider ID 51
  "51": TEAM_INFO["ksv-holstein"], // Holstein Kiel -> ligainsider ID 51
  "1246": TEAM_INFO["1-fc-union-berlin"],
  "1259": TEAM_INFO["1-fc-heidenheim"],
  "1295": TEAM_INFO["ksv-holstein"], // Holstein Kiel -> ligainsider ID 51
  "1311": TEAM_INFO["rb-leipzig"],
};

/**
 * Default team path if team not found
 */
const DEFAULT_TEAM_PATH = "bayer-04-leverkusen";

export const teamUrlMapper = {
  /**
   * Get the ligainsider URL for a team
   */
  getTeamUrl: (teamId: string, playerName?: string): string => {
    // Get team path and ligainsider ID
    const teamPath = teamUrls[teamId] || DEFAULT_TEAM_PATH;
    const ligainsiderId = ligainsiderTeamIds[teamId] || teamId;

    const link = `https://www.ligainsider.de/${teamPath}/${ligainsiderId}/`;

    logger.info(
      `Generated team URL: ${link} for team ID: ${teamId} (ligainsider ID: ${ligainsiderId})${
        playerName ? ", player: " + playerName : ""
      }`
    );
    return link;
  },

  /**
   * Add a new team mapping
   */
  addTeamMapping: (teamId: string, path: string, ligainsiderId?: string) => {
    teamUrls[teamId] = path;
    if (ligainsiderId) {
      ligainsiderTeamIds[teamId] = ligainsiderId;
    }
    logger.info(
      `Added team mapping for ID ${teamId}: path=${path}, ligainsiderId=${
        ligainsiderId || teamId
      }`
    );
  },
};
