import nodemailer from "nodemailer";
import { google } from "googleapis";

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const getGmailUser = (): string => requiredEnv("GMAIL_USER");

export const createGmailTransporter = async () => {
  const clientId = requiredEnv("GMAIL_CLIENT_ID");
  const clientSecret = requiredEnv("GMAIL_CLIENT_SECRET");
  const refreshToken = requiredEnv("GMAIL_REFRESH_TOKEN");
  const gmailUser = requiredEnv("GMAIL_USER");

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const accessTokenResponse = await oauth2Client.getAccessToken();
  if (!accessTokenResponse?.token) {
    throw new Error("Failed to retrieve access token");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: gmailUser,
      clientId,
      clientSecret,
      refreshToken,
      accessToken: accessTokenResponse.token,
    },
  });
};
