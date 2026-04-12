import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireEnv } from "@/app/API/lib/routeEnv";

// This route redirects the user to Google's OAuth consent screen.
// The registration token is passed through OAuth "state" so we can
// identify the user when Google redirects back.

export async function GET(request: NextRequest) {
  const env = requireEnv([
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "NEXT_PUBLIC_APP_BASE_URL",
  ] as const);
  if (!env.ok) return env.response;

  const oauth2Client = new google.auth.OAuth2(
    env.values.GMAIL_CLIENT_ID,
    env.values.GMAIL_CLIENT_SECRET,
    `${env.values.NEXT_PUBLIC_APP_BASE_URL}/API/auth/google/callback`
  );

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { message: "Token is required." },
      { status: 400 }
    );
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state: token, // pass the registration token through OAuth state
    prompt: "select_account",
  });

  return NextResponse.redirect(authUrl);
}
