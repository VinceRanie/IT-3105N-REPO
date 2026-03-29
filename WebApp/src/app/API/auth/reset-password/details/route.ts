import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { query } from "@/app/API/lib/mysql";

interface UserRow extends RowDataPacket {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
  course: string | null;
  profile_photo: string | null;
  reset_token_expires: Date | null;
  is_setup_complete: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ message: "Token is required." }, { status: 400 });
    }

    const users = await query<UserRow>(
      `SELECT user_id, email, first_name, last_name, department, course, profile_photo, reset_token_expires, is_setup_complete
       FROM user
       WHERE reset_token = ?`,
      [token]
    );

    const user = users[0];
    if (!user) {
      return NextResponse.json({ message: "Invalid or expired token." }, { status: 401 });
    }

    if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
      return NextResponse.json({ message: "This reset link has expired." }, { status: 401 });
    }

    if (user.is_setup_complete !== 1) {
      return NextResponse.json({ message: "Account setup is not complete yet." }, { status: 409 });
    }

    return NextResponse.json(
      {
        email: user.email,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        department: user.department || "",
        course: user.course || "",
        profile_photo: user.profile_photo || "",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password details error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
