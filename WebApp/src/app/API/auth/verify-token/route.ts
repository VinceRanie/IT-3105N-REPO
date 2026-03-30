import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { query } from "@/app/API/lib/mysql";

interface UserRow extends RowDataPacket {
  user_id: number;
  email: string;
  is_setup_complete: number;
  reset_token_expires: Date | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { message: "Token is required." },
        { status: 400 }
      );
    }

    // Look up user by reset_token
    const users = await query<UserRow>(
      "SELECT user_id, email, is_setup_complete, reset_token_expires FROM user WHERE reset_token = ?",
      [token]
    );

    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired token." },
        { status: 401 }
      );
    }

    // Check if token has expired
    if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
      return NextResponse.json(
        { message: "This link has expired. Please register again." },
        { status: 401 }
      );
    }

    // Check if user already completed setup
    if (user.is_setup_complete === 1) {
      return NextResponse.json(
        { message: "Account setup is already complete. Please log in." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Token is valid.",
        email: user.email,
        userId: user.user_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verify token error:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}