import { NextResponse } from "next/server";
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
    failed_login_attempts: number;
    lockout_until: Date | null;
    reset_token?: string | null;
}

const JWT_SECRET = process.env.JWT_TOKEN as string;

export async function POST(req: Request) {
    try {
        const {email, password}: LoginRequestBody = await req.json();
        if (!email || !password){
            return NextResponse.json(
                {message: 'Email and Password are required.', statusCode: HttpStatus.BAD_REQUEST},
                {status: HttpStatus.BAD_REQUEST}
            );
        }

        const users = await query<UserRow>(
            'SELECT user_id, email, password, failed_login_attempts, lockout_until, role FROM user WHERE email = ?',
            [email]
        );

        const user = users[0];
        
        if(!user){
            return NextResponse.json(
                {message: 'Invalid Credentials', statusCode: HttpStatus.UNAUTHORIZED},
                {status: HttpStatus.UNAUTHORIZED}
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
                { userId: user.user_id, email: user.email, role: user.role}, JWT_SECRET, {expiresIn: '1h'}
            )

            return NextResponse.json(
                {message: 'Login was successful!', token: token, statusCode: HttpStatus.OK},
                {status: HttpStatus.OK}
            )
        }else{
            const newAttempts = user.failed_login_attempts + 1;
            let message: string = 'Invalid email or password.';
            const lockoutTime: Date | null = newAttempts >= 5? new Date( new Date().getTime() + 15 * 60000): null;

            if(lockoutTime){
                message = 'Maximum login attemptes exceeded. Account locked for 15 minutes';
            }

            await query(
                'UPDATE user SET failed_login_attempts = ?, lockout_until = ? WHERE user_id = ?',
                [newAttempts, lockoutTime, user.user_id]
            );

            return NextResponse.json(
                { message, statusCode: HttpStatus.UNAUTHORIZED },
                { status: HttpStatus.UNAUTHORIZED }
            );
        }
    }
    catch (error: unknown ){
        console.error('Login Error', error);
        let errorMessage = 'Internal Server Error';
        if(error instanceof Error){
            errorMessage = error.message;
        }else if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = String((error as { message : unknown }).message);
        }
        return NextResponse.json(
            {
                message: 'An Unexpected error occured during login.',
                error: errorMessage,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR
            },
            {status: HttpStatus.INTERNAL_SERVER_ERROR}
        );
    }
}


