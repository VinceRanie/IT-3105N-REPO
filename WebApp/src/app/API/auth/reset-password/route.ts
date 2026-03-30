import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { RowDataPacket } from "mysql2";
import { query } from "../../lib/mysql";

interface PasswordResetRequestBody{
    token: string;
    newPassword?: string;
    retypePassword?: string;
}

interface UserRow extends RowDataPacket{
    user_id: number;
    email: string;
    password: string;
    reset_token: string;
    reset_token_expires?: Date | null;
}

const HttpStatus = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    INTERNAL_SERVER_ERROR: 500
};

export async function POST(req:Request) {
    try {
        const{ token, newPassword, retypePassword }: PasswordResetRequestBody = await req.json();
        if(!token || !newPassword || !retypePassword){
            return NextResponse.json(
                { message: 'Token, new password, and retype password are required.', statusCode: HttpStatus.BAD_REQUEST},
                {status: HttpStatus.BAD_REQUEST}
            );
        }

        if (newPassword !== retypePassword){
            return NextResponse.json(
                { message: 'Passwords do not match.', statusCode: HttpStatus.BAD_REQUEST},
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
            'SELECT user_id, password, reset_token_expires FROM user WHERE reset_token = ?',[token]
        );
        const user = users[0];
        if(!user) {
            return NextResponse.json(
                {message: 'Invalid or expired token.', statusCode: HttpStatus.UNAUTHORIZED},
                {status: HttpStatus.UNAUTHORIZED}
            );
        }

        if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
            return NextResponse.json(
                {message: 'Reset link has expired.', statusCode: HttpStatus.UNAUTHORIZED},
                {status: HttpStatus.UNAUTHORIZED}
            );
        }

        const isSameAsOld = await bcrypt.compare(newPassword, user.password);
        if (isSameAsOld) {
            return NextResponse.json(
                {
                    message: 'New password must be different from your current password.',
                    statusCode: HttpStatus.BAD_REQUEST
                },
                {status: HttpStatus.BAD_REQUEST}
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const nextResetAllowedAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await query(
            'UPDATE user SET password = ?, reset_token = NULL, reset_token_expires = ? where user_id = ?',
            [hashedPassword, nextResetAllowedAt, user.user_id]
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