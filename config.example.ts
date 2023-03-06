export const webappPort: number = 5173;
export const databasePath: string = "./database.db";
export const uploadTokenLifespan: number = 1000 * 60 * 60 * 24;  // 24 hours
export const partSize: number = 1024 * 1024 * 8; // 8 MB
export const fileSizeLimit: number = 1024 * 1024 * 1024;  // 1 GB

const corsProxyPort: number = 3001;
export const corsProxyURL: string = `//localhost:${corsProxyPort}`;

export const discordBotToken: string = "";
export const discordClientID: string = "";
export const discordUploadChannelID: string = "";
