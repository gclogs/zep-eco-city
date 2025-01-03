export class Config {
    static readonly ip: string = "http://221.159.66.131";
    static readonly port: number = 3000;
    
    static getApiUrl(endpoint: string): string {
        return `${this.ip}:${this.port}/api/${endpoint}`;
    }
}