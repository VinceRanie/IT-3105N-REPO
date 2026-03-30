import { NextResponse } from "next/server";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://22102959.dcism.org/biocella-api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Forgot password proxy error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
