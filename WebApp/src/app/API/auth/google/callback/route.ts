import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { RowDataPacket } from "mysql2";
import { query } from "@/app/API/lib/mysql";

// Google redirects here after the student signs in.
// Fetch their profile, verify the email matches the one they registered,
// then redirect to the finalize form with profile data in the URL.

interface UserRow extends RowDataPacket {
  user_id: number;
  email: string;
  is_setup_complete: number;
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_BASE_URL}/API/auth/google/callback`
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // this is the registration token

  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "";
  const errorRedirect = (msg: string) =>
    NextResponse.redirect(
      `${baseUrl}/signup/finalize?error=${encodeURIComponent(msg)}`
    );

  if (!code || !state) {
    return errorRedirect("Missing authorization code or token.");
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch Google profile
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      return errorRedirect("Could not retrieve email from Google.");
    }

    // Look up the user by the registration token (state)
    const users = await query<UserRow>(
      "SELECT user_id, email, is_setup_complete FROM user WHERE reset_token = ?",
      [state]
    );

    const user = users[0];

    if (!user) {
      return errorRedirect("Invalid or expired registration link.");
    }

    if (user.is_setup_complete === 1) {
      return errorRedirect("Account setup is already complete. Please log in.");
    }

    // Verify the Google email matches the registered email
    if (profile.email.toLowerCase() !== user.email.toLowerCase()) {
      return errorRedirect(
        `Email mismatch. You registered with ${user.email} but signed in with ${profile.email}. Please use the correct Google account.`
      );
    }

    // Build redirect URL with profile data
    const finalizeUrl = new URL(`${baseUrl}/signup/finalize`);
    finalizeUrl.searchParams.set("token", state);
    finalizeUrl.searchParams.set("first_name", profile.given_name || "");
    finalizeUrl.searchParams.set("last_name", profile.family_name || "");
    finalizeUrl.searchParams.set("photo", profile.picture || "");
    finalizeUrl.searchParams.set("email", user.email);
    finalizeUrl.searchParams.set("verified", "true");

    return NextResponse.redirect(finalizeUrl.toString());
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return errorRedirect("Google authentication failed. Please try again.");
  }
}
