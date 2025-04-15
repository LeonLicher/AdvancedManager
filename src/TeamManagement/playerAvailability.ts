import { Player } from './types';

export interface PlayerAvailabilityInfo {
  isLikelyToPlay: boolean;
  reason?: string;
  confidence: number; // 0-1
  lastChecked: Date;
}

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const availabilityCache = new Map<string, PlayerAvailabilityInfo>();

/**
 * Get team URL based on team ID
 */
function getTeamUrl(teamId: string): string {
  // Map of team IDs to their ligainsider URLs
  const teamUrls: { [key: string]: string } = {
    '1': 'fc-bayern-muenchen',
    '3': 'eintracht-frankfurt',
    '4': 'bayer-04-leverkusen',
    '5': 'borussia-moenchengladbach',
    '7': 'eintracht-frankfurt',
    '9': 'vfb-stuttgart',
    '10': 'tsg-hoffenheim',
    '11': 'vfl-bochum',
    '12': 'vfb-stuttgart',
    '14': 'borussia-dortmund',
    '16': 'vfl-wolfsburg',
    '17': '1-fsv-mainz-05',
    '18': 'sc-freiburg',
    '20': 'fc-st-pauli',
    '21': 'fc-augsburg',
    '24': 'vfl-bochum',
    '40': '1-fc-union-berlin',
    '43': 'rb-leipzig',
    '50': 'ksv-holstein',
    '51': '1-fc-koeln',
    '1246': '1-fc-union-berlin',
    '1259': '1-fc-heidenheim',
    '1295': 'ksv-holstein',
    '1311': 'rb-leipzig'
  };

  const teamPath = teamUrls[teamId] || 'bayer-04-leverkusen'; // Default if team not found

  const link = `https://www.ligainsider.de/${teamPath}/${teamId}/`

  console.log("🚀 ~ getTeamUrl ~ link:", link)
  return link;

}

/**
 * Parse the HTML content to find player status
 */
async function parsePlayerStatus(html: string, playerName: string): Promise<PlayerAvailabilityInfo | null> {
  try {
    // Convert HTML string to DOM for easier parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    console.log("Parsed HTML document for", playerName);

    // First try to find the player in the boost elements (lineup section)
    const boostElements = doc.querySelectorAll('[class^="boost"]');
    console.log('Found boost elements:', boostElements.length);
    
    for (const element of Array.from(boostElements)) {
      const playerText = element.textContent?.trim() || '';
      console.log('Checking boost element:', playerText, 'Looking for:', playerName);
      
      // Check if the player name is in the boost element (case insensitive)
      if (playerText.toLowerCase().includes(playerName.toLowerCase())) {
        console.log('Found matching player in lineup:', playerName);
        
        // Check if there's injury info nearby
        const statusElement = element.closest('.stadium_container_bg') || element.parentElement;
        if (statusElement) {
          const statusText = statusElement.textContent || '';
          console.log('Found status text:', statusText);
          const isInjured = statusText.includes('Verletzt') || 
                           statusText.includes('Angeschlagen') || 
                           statusText.includes('Gesperrt') ||
                           statusText.includes('Trainingsrückstand');
          
          let reason = '';
          if (isInjured) {
            // Try to extract the reason if available
            const reasonMatch = statusText.match(/(?:Verletzt|Angeschlagen|Gesperrt|Trainingsrückstand):\s*(.+?)(?:\s|$)/);
            reason = reasonMatch ? reasonMatch[1] : statusText;
          }

          return {
            isLikelyToPlay: isInjured,
            reason: isInjured ? reason : undefined,
            confidence: isInjured ? 0.9 : 0.8,
            lastChecked: new Date()
          };
        } else {
          // Player found in lineup without status, likely to play
          return {
            isLikelyToPlay: true,
            confidence: 0.8,
            lastChecked: new Date()
          };
        }
      }
    }
    
    // If not found in boost elements, try all img elements
    const imgElements = doc.querySelectorAll('img');
    console.log('Found img elements:', imgElements.length);
    
    for (const img of Array.from(imgElements)) {
      const srcAttr = img.getAttribute('src') || '';
      console.log('Checking image src:', srcAttr, 'Looking for:', playerName);
      
      // Check if the image src contains the player name (case insensitive)
      if (srcAttr.toLowerCase().includes(playerName.toLowerCase())) {
        console.log('Found matching image for player:', playerName, 'at URL:', srcAttr);
        
        // If in "Gegen ... fehlen" section, player is injured
        const injurySection = img.closest('table') || img.closest('section');
        if (injurySection && injurySection.textContent?.includes('fehlen')) {
          // Try to find the reason
          const reasonText = injurySection.textContent || '';
          const reasonMatch = reasonText.match(new RegExp(`${playerName}.*?(Verletzt|Angeschlagen|Gesperrt|Trainingsrückstand).*?`, 'i'));
          const reason = reasonMatch ? reasonMatch[0] : 'Nicht im Kader';
          
          return {
            isLikelyToPlay: false,
            reason: reason,
            confidence: 0.9,
            lastChecked: new Date()
          };
        }
        
        // Otherwise player is likely available
        return {
          isLikelyToPlay: true,
          confidence: 0.7,
          lastChecked: new Date()
        };
      }
    }
    
    // If player was not found in the lineup or images
    return {
      isLikelyToPlay: false,
      reason: 'Nicht im Kader',
      confidence: 0.7,
      lastChecked: new Date()
    };
  } catch (error) {
    console.error('Error parsing player status:', error);
    return null;
  }
}

/**
 * Check if a player is likely to play based on ligainsider.com data
 */
export async function checkPlayerAvailability(player: Player): Promise<PlayerAvailabilityInfo> {
  const cacheKey = `${player.firstName}_${player.teamId}`;
  const cachedInfo = availabilityCache.get(cacheKey);
  
  // Return cached data if it's less than 1 hour old
  if (cachedInfo && (new Date().getTime() - cachedInfo.lastChecked.getTime()) < CACHE_DURATION) {
    return cachedInfo;
  }

  try {
    const teamId = player.teamId;
    console.log("🚀 ~ checkPlayerAvailability ~ team:", player.teamName)
    console.log("🚀 ~ checkPlayerAvailability ~ teamId:", teamId)
    console.log("------------")
    
    // Use the team page URL
    const teamUrl = getTeamUrl(teamId);;
    console.log(`Checking availability for ${player.firstName} at ${teamUrl}`);

    // Use allorigins.win as a CORS proxy to get the HTML content
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(teamUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('Received HTML length:', html.length);
    
    const status = await parsePlayerStatus(html, player.firstName);
    
    if (status) {
      // Cache the result
      availabilityCache.set(cacheKey, status);
      return status;
    }

    // Default fallback if we couldn't determine status
    const defaultInfo: PlayerAvailabilityInfo = {
      isLikelyToPlay: true,
      confidence: 0.6,
      lastChecked: new Date()
    };

    availabilityCache.set(cacheKey, defaultInfo);
    return defaultInfo;

  } catch (error) {
    console.error(`Error checking availability for ${player.firstName}:`, error);
    return {
      isLikelyToPlay: true, // Assume player is available if check fails
      confidence: 0.5,
      lastChecked: new Date()
    };
  }
}

/**
 * Get availability status for multiple players
 */
export async function checkTeamAvailability(players: Player[]): Promise<Map<string, PlayerAvailabilityInfo>> {
  const availabilityMap = new Map<string, PlayerAvailabilityInfo>();
  
  // Check availability for all players in parallel
  const checks = players.map(async player => {
    const availability = await checkPlayerAvailability(player);
    availabilityMap.set(player.id, availability);
  });
  
  await Promise.all(checks);
  return availabilityMap;
}

/**
 * Calculate an adjusted score for a player based on their availability
 */
export function calculateAdjustedPoints(
  player: Player,
  availability: PlayerAvailabilityInfo
): number {
  if (!availability.isLikelyToPlay) {
    return 0; // Player won't play, so expected points are 0
  }

  // Adjust points based on confidence in availability
  return player.averagePoints * availability.confidence;
} 