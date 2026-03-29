import { NextResponse } from "next/server";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://22102959.dcism.org/biocella-api";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const backendResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await backendResponse.json();
        const response = NextResponse.json(data, { status: backendResponse.status });

        if (backendResponse.ok && data?.token) {
            response.cookies.set("auth_token", data.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60,
            });
        }

        return response;
    }
    catch (error: unknown ){
        console.error("Login proxy error", error);
        return NextResponse.json(
            { message: "An unexpected error occurred during login." },
            { status: 500 }
        );
    }
}


