export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { query } from "../../lib/mysql";

interface ForgotPasswordRequestBody {
  email: string;
}

interface UserRow extends RowDataPacket {
  user_id: number;
  email: string;
  is_setup_complete: number;
  reset_token?: string | null;
  reset_token_expires?: Date | null;
}

const createTransporter = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
  });

  const accessTokenResponse = await oauth2Client.getAccessToken();
  if (!accessTokenResponse?.token) {
    throw new Error("Failed to retrieve access token");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER!,
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      accessToken: accessTokenResponse.token,
    },
  });
};

export async function POST(req: Request) {
  try {
    const { email }: ForgotPasswordRequestBody = await req.json();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || typeof email !== "string" || !emailRegex.test(email) || !email.endsWith("usc.edu.ph")) {
      return NextResponse.json({ message: "Invalid USC email." }, { status: 400 });
    }

    const users = await query<UserRow>(
      "SELECT user_id, email, is_setup_complete, reset_token, reset_token_expires FROM user WHERE email = ?",
      [email]
    );

    // Only send reset email for existing accounts.
    if (users.length === 0) {
      return NextResponse.json(
        { message: "Email is not registered." },
        { status: 404 }
      );
    }

    if (users[0].is_setup_complete !== 1) {
      return NextResponse.json(
        { message: "Account setup is not complete yet." },
        { status: 409 }
      );
    }

    // Cooldown applies only after a successful reset: reset_token is NULL but expiry is still in the future.
    const user = users[0];
    if (
      !user.reset_token &&
      user.reset_token_expires &&
      new Date() < new Date(user.reset_token_expires)
    ) {
      const secondsLeft = Math.max(
        1,
        Math.ceil((new Date(user.reset_token_expires).getTime() - Date.now()) / 1000)
      );
      const hoursLeft = Math.ceil(secondsLeft / 3600);

      return NextResponse.json(
        {
          message: `You can request another password reset after ${hoursLeft} hour(s).`,
        },
        { status: 429 }
      );
    }

    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await query<ResultSetHeader>(
      "UPDATE user SET reset_token = ?, reset_token_expires = ? WHERE user_id = ?",
      [resetToken, tokenExpiry, user.user_id]
    );

    const transporter = await createTransporter();
    const resetLink = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/forgot-password/reset?token=${resetToken}`;

    await transporter.sendMail({
      from: `"BIOCELLA" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Reset Your BIOCELLA Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #113F67;">BIOCELLA Password Reset</h2>
          <p>We received a request to reset your password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background-color: #113F67; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <p>Sincerely,<br/><strong>BIOCELLA Team</strong></p>
        </div>
      `,
    });

    return NextResponse.json(
      { message: "Reset link sent to your email." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
