import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://22102959.dcism.org/biocella-api";

export async function POST() {
  let data = { message: "Logged out successfully." };
  let status = 200;

  try {
    const backendResponse = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    status = backendResponse.status;
    data = await backendResponse.json();
  } catch (error) {
    console.error("Logout proxy error:", error);
  }

  const response = NextResponse.json(data, { status });

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // expire immediately
  });

  return response;
}
