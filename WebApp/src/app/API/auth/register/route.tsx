
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4} from 'uuid';
import nodemailer from 'nodemailer'
import { google } from "googleapis";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { query } from "../../lib/mysql";

interface RegisterRequestBody{
    email: string;
}

interface RegisterSucessResponse{
    message: string;
    userId: number;
    email: string;
}

interface UserRow extends RowDataPacket{
    user_id: number;
    email: string;
    password?:string;
    failed_login_attempts?: number; 
    lockout_until?: Date | null;    
    reset_token?: string | null;
}

const createTransporter = async() => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.EMAIL_CLIENT_ID,
        process.env.EMAIL_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.EMAIL_CLIENT_REFRESH_TOKEN
    });
    const accessToken = await new Promise<string>((resolve, reject) => {
        oauth2Client.getAccessToken((err: Error | null | undefined, token: string | null | undefined) => {
        if(err){
            console.error("Failed to retrieve access token", err);
            reject (new Error("Failed to retrieve access token: " + err.message)); // Added err.message
        }
        if (token) { 
            resolve(token);
        } else {
            reject(new Error("Access token was null or undefined, but no explicit error received."));
        }
    });
});
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth:{
            type: 'OAuth2',
            user: process.env.EMAIL_USER,
            clientId: process.env.EMAIL_CLIENT_ID,
            clientSecret: process.env.EMAIL_CLIENT_SECRET,
            refreshToken: process.env.EMAIL_CLIENT_REFRESH_TOKEN,
            accessToken: accessToken
        }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
};

const HttpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
}

export async function POST(req: Request){
    try{
        const { email }: RegisterRequestBody = await req.json();
        if(!email || typeof email !== 'string' || !email.endsWith('usc.edu.ph')){
            return NextResponse.json(
                {message: 'Invalid email format or not USC email.', statusCode: HttpStatus.BAD_REQUEST},
                {status: HttpStatus.BAD_REQUEST}
            );
        }

        const existingUsers = await query<UserRow>(
            'SELECT user_id, email FROM user WHERE email = ?', [email]
        );
        if(existingUsers.length>0){
            return NextResponse.json(
                {message: 'User already exists.', statusCode: HttpStatus.BAD_REQUEST},
                {status: HttpStatus.BAD_REQUEST}
            );
        }

        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
        let plainTextPassword = '';
        const passwordLength = 12;
        for (let i=0; i<passwordLength; i++){
            plainTextPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const hashedPassword = await bcrypt.hash(plainTextPassword, 10);

        const resetToken = uuidv4();

        const insertResultArray = await query<ResultSetHeader>(
            'INSERT INTO user (email, password, reset_token, name, role) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, resetToken, '', 'student']
        );
        const insertResult  = insertResultArray[0];
        const newUserId = insertResult.insertId;
        const transporter = await createTransporter();
        await transporter.sendMail({
            from: '"BIOCELLA App" <'+ process.env.EMAIL_USER + '>',
            to: email,
            subject: 'Your Registration and Password.',
            html:  `<p>Hi,</p>
            <p>Thank you for registering for our application!</p>
            <p>Your default login password is: <strong>${plainTextPassword}</strong></p>
            <p>IMPORTANT: For security reasons, please click the link below to set your own secure password immediately after your first login:</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_BASE_URL}/auth/reset-password?token=${resetToken}">Reset Your Password Now</a></p>
            <p>If you did not register for this service, please ignore this email.</p>
            <p>Sincerely,</p>
            <p>BIOCELLA</p>`
        });

        return NextResponse.json<RegisterSucessResponse>(
            { 
                message: 'User registered successfully. An initial password and changepassword link was sent to your email.',
                userId: newUserId,
                email: email
            },{status: HttpStatus.CREATED}
        );
    }
    catch (error: unknown){
        console.error('Registration Error: ',error);
        let errorMessage = 'Internal Server Error';
        if(error instanceof Error){
            errorMessage = error.message;
        }else if (typeof error === 'object' && error !== null && 'message' in error){
            errorMessage = String((error as { message: unknown}).message);
        }
        return NextResponse.json(
            {
                message: 'An unexpected error occured during registration.',
                error: errorMessage,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            },{status: HttpStatus.INTERNAL_SERVER_ERROR}
        );
    }
}
export async function GET() {
    return NextResponse.json(
        {message: 'Method not allowed.', statusCode: HttpStatus.METHOD_NOT_ALLOWED,}, {status: HttpStatus.METHOD_NOT_ALLOWED}
    );
}

