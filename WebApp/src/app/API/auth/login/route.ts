import { NextResponse } from "next/server";
<<<<<<< HEAD
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://22102959.dcism.org/biocella-api";
=======
import { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken'; 
import { query } from "@/app/API/lib/mysql";

const HttpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    INTERNAL_SERVER_ERROR: 500,
};

interface LoginRequestBody {
    email: string;
    password?: string;
}

interface UserRow extends RowDataPacket {
    user_id: number;
    email: string;
    password: string;
    role: 'admin' | 'student' | 'faculty' | 'staff';
    is_setup_complete: number;
    failed_login_attempts: number;
    lockout_until: Date | null;
    reset_token?: string | null;
}

const getJwtSecret = () => process.env.JWT_TOKEN || process.env.JWT_SECRET;
>>>>>>> 8a3b51ec4e71dc248b9fbd71f91b8d7dcecc46c9

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const backendResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

<<<<<<< HEAD
        const data = await backendResponse.json();
        const response = NextResponse.json(data, { status: backendResponse.status });

        if (backendResponse.ok && data?.token) {
            response.cookies.set("auth_token", data.token, {
=======
        const jwtSecret = getJwtSecret();
        if (!jwtSecret) {
            return NextResponse.json(
                {
                    message: 'Authentication service is not configured.',
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR
                },
                { status: HttpStatus.INTERNAL_SERVER_ERROR }
            );
        }

        const users = await query<UserRow>(
            'SELECT user_id, email, password, role, is_setup_complete, failed_login_attempts, lockout_until FROM user WHERE email = ?',
            [email]
        );

        const user = users[0];
        
        if(!user){
            return NextResponse.json(
                {message: 'Invalid Credentials', statusCode: HttpStatus.UNAUTHORIZED},
                {status: HttpStatus.UNAUTHORIZED}
            );
        }

        if (user.is_setup_complete !== 1) {
            return NextResponse.json(
                { message: 'Account setup is not complete. Please finish registration.', statusCode: HttpStatus.FORBIDDEN },
                { status: HttpStatus.FORBIDDEN }
            );
        }

        if (user.lockout_until && new Date() < new Date(user.lockout_until)){
            return NextResponse.json(
                { message: 'Account is locked please try again.', statusCode: HttpStatus.FORBIDDEN },
                { status: HttpStatus.FORBIDDEN}
            );
        }
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if(passwordMatch){
            await query(
                'UPDATE user set failed_login_attempts = 0, lockout_until = NULL WHERE user_id = ?', [user.user_id]
            );

            const token = jwt.sign(
                { userId: user.user_id, email: user.email, role: user.role}, jwtSecret, {expiresIn: '1h'}
            )

            const response = NextResponse.json(
                {
                    message: 'Login was successful!',
                    token,
                    role: user.role,
                    userId: user.user_id,
                    email: user.email,
                    statusCode: HttpStatus.OK
                },
                {status: HttpStatus.OK}
            );

            response.cookies.set('auth_token', token, {
>>>>>>> 8a3b51ec4e71dc248b9fbd71f91b8d7dcecc46c9
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


