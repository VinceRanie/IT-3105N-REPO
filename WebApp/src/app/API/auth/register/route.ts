import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://22102959.dcism.org/biocella-api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error("Registration proxy error:", error);

    return NextResponse.json(
      { message: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}
