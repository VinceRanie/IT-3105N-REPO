import { NextRequest, NextResponse } from "next/server";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://22102959.dcism.org/biocella-api";

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

    const response = await fetch(`${API_BASE_URL}/auth/get-user-by-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    if (!response.ok || !data?.user) {
      return NextResponse.json(
        { message: data?.message || "Invalid or expired token." },
        { status: response.status || 401 }
      );
    }

    const user = data.user;
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