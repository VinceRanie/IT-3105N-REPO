import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { RowDataPacket } from "mysql2";
import { query } from "@/app/API/lib/mysql";
import { isStrongPassword } from "@/app/API/lib/validation";

interface UserRow extends RowDataPacket {
  user_id: number;
  email: string;
  is_setup_complete: number;
  reset_token_expires: Date | null;
}

export async function POST(request: NextRequest) {
  try {
    const {
      token,
      email,
      first_name,
      last_name,
      profile_photo,
      department,
      course,
      password,
      retypePassword,
    } =
      await request.json();

    if (!token || !email || !first_name || !last_name || !department || !course || !password || !retypePassword) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (password !== retypePassword) {
      return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 6 characters long and contain at least one uppercase, one lowercase, and one number.",
        },
        { status: 400 }
      );
    }

    const users = await query<UserRow>(
      "SELECT user_id, email, is_setup_complete, reset_token_expires FROM user WHERE reset_token = ?",
      [token]
    );

    const user = users[0];

    if (!user) {
      return NextResponse.json({ message: "Invalid or expired token." }, { status: 401 });
    }

    if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
      return NextResponse.json({ message: "This link has expired. Please register again." }, { status: 401 });
    }

    if (user.is_setup_complete === 1) {
      return NextResponse.json({ message: "Account setup is already complete. Please log in." }, { status: 409 });
    }

    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ message: "Email does not match this setup token." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      `UPDATE user
        SET first_name = ?,
            last_name = ?,
            profile_photo = ?,
            department = ?,
            course = ?,
            password = ?,
            is_setup_complete = 1,
            reset_token = NULL,
            reset_token_expires = NULL
        WHERE user_id = ? AND reset_token = ?`,
      [
        first_name,
        last_name,
        profile_photo || null,
        department,
        course,
        hashedPassword,
        user.user_id,
        token,
      ]
    );

    return NextResponse.json(
      { message: "Signup finalized successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Finalize signup error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
