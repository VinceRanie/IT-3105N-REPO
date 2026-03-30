export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { query } from "../../lib/mysql";

interface RegisterRequestBody {
  email: string;
}

interface RegisterSucessResponse {
  message: string;
  userId: number;
  email: string;
}

interface UserRow extends RowDataPacket {
  user_id: number;
  email: string;
  is_setup_complete?: number;
  password?: string;
  failed_login_attempts?: number;
  lockout_until?: Date | null;
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

const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export async function POST(req: Request) {
  try {
    const { email }: RegisterRequestBody = await req.json();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !email ||
      typeof email !== "string" ||
      !emailRegex.test(email) ||
      !email.endsWith("usc.edu.ph")
    ) {
      return NextResponse.json(
        {
          message: "Invalid email format or not USC email.",
          statusCode: HttpStatus.BAD_REQUEST,
        },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    const existingUsers = await query<UserRow>(
      "SELECT user_id, email, is_setup_complete FROM user WHERE email = ?",
      [email]
    );

    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000);

    let userId: number;
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      // Only block sign-up when the account is already fully set up.
      if (existingUser.is_setup_complete === 1) {
        return NextResponse.json(
          { message: "User already exists.", statusCode: HttpStatus.CONFLICT },
          { status: HttpStatus.CONFLICT }
        );
      }

      await query<ResultSetHeader>(
        `
        UPDATE user
        SET reset_token = ?, reset_token_expires = ?
        WHERE user_id = ?
        `,
        [resetToken, tokenExpiry, existingUser.user_id]
      );

      userId = existingUser.user_id;
    } else {
      const insertResultArray = await query<ResultSetHeader>(
        `
        INSERT INTO user (
          email,
          reset_token,
          reset_token_expires,
          role
        ) VALUES (?, ?, ?, ?)
        `,
        [email, resetToken, tokenExpiry, "student"]
      );

      userId = insertResultArray[0].insertId;
    }

    const transporter = await createTransporter();

    await transporter.sendMail({
      from: `"BIOCELLA" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Finalize Your BIOCELLA Account Setup",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #113F67;">Welcome to BIOCELLA!</h2>
          <p>Hi there,</p>
          <p>Thank you for registering with your USC email. To complete your account setup, click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_BASE_URL}/signup/finalize?token=${resetToken}"
               style="background-color: #113F67; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Finalize Setup
            </a>
          </div>
          <p>You will be asked to sign in with your Google account (<strong>${email}</strong>) to verify your identity. Your name and profile photo will be fetched automatically.</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not register for this service, please ignore this email.</p>
          <p>Sincerely,<br/><strong>BIOCELLA Team</strong></p>
        </div>
      `,
    });

    return NextResponse.json<RegisterSucessResponse>(
      {
        message:
          "Finalize setup link sent! Check your email.",
        userId,
        email,
      },
      { status: HttpStatus.CREATED }
    );
  } catch (error: unknown) {
    console.error("Registration Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json(
      {
        message: "An unexpected error occurred during registration.",
        error: errorMessage,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "Method not allowed.",
      statusCode: HttpStatus.METHOD_NOT_ALLOWED,
    },
    { status: HttpStatus.METHOD_NOT_ALLOWED }
  );
}
