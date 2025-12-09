import {NextResponse} from "next/server";

const HttpStatus ={
    OK: 200,
    UNAUTHORIZED: 401,
    METHOD_NOT_ALLOWED: 405,
}

export async function POST(req: Request){
    try{
        const {email, password} = await req.json();
        const DEMO_EMAIL = 'admin';
        const DEMO_PASSWORD = 'test';

        if(email === DEMO_EMAIL && password === DEMO_PASSWORD){
            return NextResponse.json(
                {message: 'Login successful!', statusCode: HttpStatus.OK},
                {status: HttpStatus.OK}
            );
        }else{
            return NextResponse.json(
                {message: 'Invalid credentials. Please try again.', statusCode: HttpStatus.UNAUTHORIZED},
                {status: HttpStatus.UNAUTHORIZED}
            );
        }
    } catch(error){
        console.error('Login Error:', error);
        return NextResponse.json(
            {message: 'An unexpected error occurred during login.', statusCode: 500},
            {status: 500}
        );
    }
}
export async function GET(){
    return NextResponse.json(
        {message: 'Method not allowed.', statusCode: HttpStatus.METHOD_NOT_ALLOWED},
        {status: HttpStatus.METHOD_NOT_ALLOWED}
    );
}
