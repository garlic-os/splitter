const webappPort: number = 5173;
export const webappURL: string = `http://localhost:${webappPort}`;

export const databasePath: string = "./database.db";

export const uploadTokenLifespan: number = 1000 * 60 * 60 * 24;  // 24 hours
export const partSize: number = 1024 * 1024 * 25;  // 25 MB - Make this the max attachment size in the server your instance uploads to.
export const fileSizeLimit: number = 1024 * 1024 * 1024 * 10;  // 10 GB

export const discordBotToken: string = "";
export const discordClientID: string = "";
export const discordUploadChannelID: string = "";

// HTTPS
export const sslKeyPath: string | null = null;
export const sslCertPath: string | null = null;
