/**
 * HTML Parser service for checking player availability
 */
import { PlayerAvailabilityInfo } from "../playerAvailability";
import { Logger } from "../utils/logger";

export class HTMLParser {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Fetch HTML content from URL using a CORS proxy
   */
  public async fetchHtml(url: string): Promise<string | null> {
    try {
      // Use allorigins.win as a CORS proxy to get the HTML content
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        url
      )}`;
      this.logger.info(`Fetching data from proxy: ${proxyUrl}`);

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      this.logger.debug(`Received HTML length: ${html.length}`);
      return html;
    } catch (error) {
      this.logger.error(`Error fetching HTML:`, error);
      return null;
    }
  }

  /**
   * Fetch and parse player status from a team URL
   */
  public async fetchAndParsePlayerStatus(
    teamUrl: string,
    playerName: string
  ): Promise<PlayerAvailabilityInfo | null> {
    try {
      const html = await this.fetchHtml(teamUrl);

      if (!html) {
        this.logger.error(`Failed to fetch HTML content for ${playerName}`);
        return null;
      }

      return this.parsePlayerStatus(html, playerName);
    } catch (error) {
      this.logger.error(`Error fetching and parsing player status:`, error);
      return null;
    }
  }

  /**
   * Parse the HTML content to find player status
   */
  public async parsePlayerStatus(
    html: string,
    playerName: string
  ): Promise<PlayerAvailabilityInfo | null> {
    try {
      this.logger.info(`Parsing HTML content to find status for ${playerName}`);

      // Convert HTML string to DOM for easier parsing
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      this.logger.debug(`Parsed HTML document for ${playerName}`);

      // First look specifically for the player_name div structure
      const playerNameDivs = doc.querySelectorAll("div.player_name");
      this.logger.info(`Found ${playerNameDivs.length} player_name divs`);

      for (const div of Array.from(playerNameDivs)) {
        const playerText = div.textContent?.trim() || "";
        this.logger.debug(`Checking player_name div: ${playerText}`);

        if (playerText.toLowerCase().includes(playerName.toLowerCase())) {
          this.logger.info(
            `Found matching player in player_name div: ${playerName}`
          );

          // Check if there's injury info nearby
          const parentSection = div.closest("section");
          if (
            parentSection &&
            (parentSection.textContent?.includes("Verletzt") ||
              parentSection.textContent?.includes("Angeschlagen") ||
              parentSection.textContent?.includes("Gesperrt") ||
              parentSection.textContent?.includes("fehlen"))
          ) {
            return {
              isLikelyToPlay: false,
              reason: "Verletzung oder Sperre",
              confidence: 0.9,
              lastChecked: new Date(),
            };
          }

          return {
            isLikelyToPlay: true,
            confidence: 0.9,
            lastChecked: new Date(),
          };
        }
      }

      // Then try to find the player in the boost elements (lineup section)
      const boostElements = doc.querySelectorAll('[class^="boost"]');
      this.logger.info(`Found ${boostElements.length} boost elements`);

      for (const element of Array.from(boostElements)) {
        const playerText = element.textContent?.trim() || "";
        this.logger.debug(`Checking boost element text: ${playerText}`);

        // Check if the player name is in the boost element (case insensitive)
        if (playerText.toLowerCase().includes(playerName.toLowerCase())) {
          this.logger.info(`Found matching player in lineup: ${playerName}`);

          // Check if there's injury info nearby
          const statusElement =
            element.closest(".stadium_container_bg") || element.parentElement;
          if (statusElement) {
            const statusText = statusElement.textContent || "";
            this.logger.debug(`Found status text: ${statusText}`);
            const isInjured =
              statusText.includes("Verletzt") ||
              statusText.includes("Angeschlagen") ||
              statusText.includes("Gesperrt") ||
              statusText.includes("Trainingsrückstand");

            let reason = "";
            if (isInjured) {
              // Try to extract the reason if available
              const reasonMatch = statusText.match(
                /(?:Verletzt|Angeschlagen|Gesperrt|Trainingsrückstand):\s*(.+?)(?:\s|$)/
              );
              reason = reasonMatch ? reasonMatch[1] : statusText;
            }

            return {
              isLikelyToPlay: !isInjured,
              reason: isInjured ? reason : undefined,
              confidence: isInjured ? 0.9 : 0.8,
              lastChecked: new Date(),
            };
          } else {
            // Player found in lineup without status, likely to play
            return {
              isLikelyToPlay: true,
              confidence: 0.8,
              lastChecked: new Date(),
            };
          }
        }
      }

      // If not found in specific elements, try all img elements
      const imgElements = doc.querySelectorAll("img");
      this.logger.info(`Found ${imgElements.length} img elements`);

      for (const img of Array.from(imgElements)) {
        const srcAttr = img.getAttribute("src") || "";

        // Check if the image src contains the player name (case insensitive)
        if (srcAttr.toLowerCase().includes(playerName.toLowerCase())) {
          this.logger.info(
            `Found matching image for player: ${playerName} at URL: ${srcAttr}`
          );

          // If in "Gegen ... fehlen" section, player is injured
          const injurySection = img.closest("table") || img.closest("section");
          if (injurySection && injurySection.textContent?.includes("fehlen")) {
            // Try to find the reason
            const reasonText = injurySection.textContent || "";
            const reasonMatch = reasonText.match(
              new RegExp(
                `${playerName}.*?(Verletzt|Angeschlagen|Gesperrt|Trainingsrückstand).*?`,
                "i"
              )
            );
            const reason = reasonMatch ? reasonMatch[0] : "Nicht im Kader";

            return {
              isLikelyToPlay: false,
              reason: reason,
              confidence: 0.9,
              lastChecked: new Date(),
            };
          }

          // Otherwise player is likely available
          return {
            isLikelyToPlay: true,
            confidence: 0.7,
            lastChecked: new Date(),
          };
        }
      }

      // If player was not found in the lineup or images
      this.logger.warning(`Player ${playerName} not found in HTML content`);
      return {
        isLikelyToPlay: false,
        reason: "Nicht im Kader",
        confidence: 0.7,
        lastChecked: new Date(),
      };
    } catch (error) {
      this.logger.error("Error parsing player status:", error);
      return null;
    }
  }
}
