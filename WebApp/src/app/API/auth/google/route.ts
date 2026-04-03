import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// This route redirects the user to Google's OAuth consent screen.
// The registration token is passed through OAuth "state" so we can
// identify the user when Google redirects back.

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_BASE_URL}/API/auth/google/callback`
);

export async function GET(request: NextRequest) {
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
