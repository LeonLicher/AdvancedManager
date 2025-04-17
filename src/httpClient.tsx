/* eslint-disable @typescript-eslint/no-explicit-any */
type RequestOptions = {
    headers?: HeadersInit;
    body?: any;
};

class HttpClient {
    private baseUrl: string;
    private backendUrl: string;
    private token: string | null = null;
    public usedPlayerIds: Set<string> = new Set();
    private localPlayerIds: Set<string> = new Set();

    constructor(baseUrl: string, backendUrl: string) {
        this.baseUrl = baseUrl;
        this.backendUrl = backendUrl;
    }

    public setToken(token: string) {
        this.token = token;
    }


    // Method to fetch and store player IDs initially
    public async fetchAndStorePlayerIds(): Promise<void> {
        try {
            const response = await fetch('/player-images/players.json');
            const playerIds: string[] = await response.json();
            playerIds.forEach(id => this.localPlayerIds.add(id));
        } catch (error: any) {
        }
    }
    

    private async request<T>(
        method: string,
        url: string,
        { headers = {}, body }: RequestOptions = {}
    ): Promise<T> {

        let fullUrl: string;
        if(url.includes('api')) {
            fullUrl = `${this.backendUrl}${url}`;

        } else {
            fullUrl = `${this.baseUrl}${url}`;
        }


        const requestHeaders = new Headers(headers);
        requestHeaders.append('Content-Type', 'application/json');
        requestHeaders.append('Accept', 'application/json');
        requestHeaders.append('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');

        if (this.token && url.includes('v4')){
            requestHeaders.append('Authorization', `Bearer ${this.token}`);

        }

        try {
            const response = await fetch(fullUrl, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseData: T = await response.json();
            return responseData;
        } catch (error) {
            throw error;
        }
    }

    public get<T>(url: string, headers?: HeadersInit): Promise<T> {
        return this.request<T>('GET', url, { headers });
    }

    public post<T>(url: string, body: any, headers?: HeadersInit): Promise<T> {

        return this.request<T>('POST', url, { headers, body });
    }

    public put<T>(url: string, body: any, headers?: HeadersInit): Promise<T> {
        return this.request<T>('PUT', url, { headers, body });
    }

    public delete<T>(url: string, headers?: HeadersInit): Promise<T> {
        return this.request<T>('DELETE', url, { headers });
    }

    public getPlayerImageUrl(playerId: string): string {
      return `/AdvancedManager/player-images/${playerId}.png`;
    }

    /**
     * Check if a player is available to play
     * This directly calls the availability endpoint
     */
    public async checkPlayerAvailability(playerName: string, teamId?: string): Promise<boolean> {
        try {
            // If we don't have enough info, assume the player is available
            if (!playerName) {
                console.warn("Missing player name for availability check");
                return true;
            }

            const playerData = {
                firstName: playerName,
                teamId: teamId || "unknown" // Safe fallback
            };

            const response = await this.post<{isLikelyToPlay: boolean}>(
                "/api/check-availability",
                { player: playerData }
            );
            
            return response.isLikelyToPlay;
        } catch (error) {
            console.error(`Error checking availability for ${playerName}:`, error);
            // Default to available on error for safety
            return true;
        }
    }

    // New method to get formatted used player IDs
    public getFormattedUsedPlayerIds(): string {
        return Array.from(this.usedPlayerIds).join(',');
    }

    // Keep the existing method for compatibility
    public getUsedPlayerIds(): string[] {
        return Array.from(this.usedPlayerIds);
    }
}

export default HttpClient;
