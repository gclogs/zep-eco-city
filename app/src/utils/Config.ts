/**
 * Configuration class for managing application settings.
 * Provides methods to retrieve API URLs.
 */
export class Config {
    static readonly ip: string = "http://220.87.215.43";
    static readonly port: number = 3000;
    
    static getApiUrl(endpoint: string): string {
        return `${this.ip}:${this.port}/api/${endpoint}`;
    }
}