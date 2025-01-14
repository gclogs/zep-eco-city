/**
 * Configuration class for managing application settings.
 * Provides methods to retrieve API URLs.
 */

export enum COLOR {
    RED = 0xff0000,
    GREEN = 0x00ff00,
    BLUE = 0x0000ff
}

export const CONFIG = {
    ip: "http://218.158.196.248",
    port: 3000,

    apiURL(endpoint: string): string {
        return `${this.ip}:${this.port}/api/${endpoint}`;
    }
}