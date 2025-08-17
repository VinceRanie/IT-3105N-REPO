import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { RowDataPacket } from "mysql2";
import { query } from "../../lib/mysql";

interface PasswordResetRequestBody{
    token: string;
    newPassword?: string;
}

interface UserRow extends RowDataPacket{
    user_id: number;
    email: string;
    reset_token: string;
}

const HttpStatus = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    INTERNAL_SERVER_ERROR: 500
};

export async function POST(req:Request) {
    try {
        const{ token, newPassword }: PasswordResetRequestBody = await req.json();
        if(!token || !newPassword){
            return NextResponse.json(
                { message: 'Token and new password are required.', statusCode: HttpStatus.BAD_REQUEST},
                {status: HttpStatus.BAD_REQUEST}
            );
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if(!passwordRegex.test(newPassword)){
            return NextResponse.json(
                {
                    message: 'Password must be atleast 6 characters long and contain atleast one uppercase, one lowercase, and a number.',
                    status: HttpStatus.BAD_REQUEST
                },
                { status: HttpStatus.BAD_REQUEST}
            )
        }

        const users = await query<UserRow>(
            'SELECT user_id FROM user WHERE reset_token = ?',[token]
        );
        const user = users[0];
        if(!user) {
            return NextResponse.json(
                {message: 'Invalid or expired token.', statusCode: HttpStatus.UNAUTHORIZED},
                {status: HttpStatus.UNAUTHORIZED}
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await query(
            'UPDATE user SET password = ?, reset_token = NULL where user_id = ?', [hashedPassword, user.user_id]
        )
        return NextResponse.json(
            {message: 'Password has been successfully reset.', statusCode: HttpStatus.OK},
            {status: HttpStatus.OK}
        );
    } catch (error: unknown){
        console.error('Password Reset Error', error);
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error){
            errorMessage = error.message
        }
        return NextResponse.json(
            {
                message: 'An unexpected error occurred during password reset. ',
                error: errorMessage,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR
            },
            {status: HttpStatus.INTERNAL_SERVER_ERROR}
        );
    }
}