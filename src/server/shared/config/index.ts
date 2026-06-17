import dotenv from "dotenv";
dotenv.config();

export interface AppConfig {
  port: number;
  environment: string;
  databaseUrl?: string;
  geminiApiKey?: string;
  enableAuditLogs: boolean;
  tokenExpiryMins: number;
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  environment: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  enableAuditLogs: process.env.ENABLE_AUDIT_LOGS !== "false",
  tokenExpiryMins: parseInt(process.env.TOKEN_EXPIRY_MINS || "1440", 10),
};
