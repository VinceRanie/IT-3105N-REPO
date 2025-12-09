import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/app/API/lib/mysql";

export async function POST(request: NextRequest) {
  try {
    const { email, first_name, last_name, department, course, password, retypePassword } =
      await request.json();

    if (!email || !first_name || !last_name || !department || !course || !password || !retypePassword) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (password !== retypePassword) {
      return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      `UPDATE user
        SET first_name = ?, last_name = ?, department = ?, course = ?, password = ?, is_setup_complete = 1, reset_token = NULL
        WHERE email = ?`,
      [first_name, last_name, department, course, hashedPassword, email]
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
