import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_TOKEN = process.env.JWT_TOKEN;
if (!JWT_TOKEN) {
  throw new Error("Missing JWT_TOKEN");
}
const JWT_SECRET = new TextEncoder().encode(JWT_TOKEN);

const roleAccess: Record<string, string[]> = {
  "/AdminUI": ["admin"],
  "/UsersUI": ["student", "faculty"],
  "/RAStaffUI": ["ra", "staff"],
};

const authPages = ["/Login", "/signup", "/forgot-password"];

const normalizeRole = (role: string) => role.toLowerCase();
const redirectToLogin = (request: NextRequest) =>
  NextResponse.redirect(new URL("/Login", request.url));
const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set("auth_token", "", { path: "/", maxAge: 0 });
  return response;
};

const getDashboardPath = (role: string) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "admin") return "/AdminUI/AdminDashBoard";
  if (normalizedRole === "student" || normalizedRole === "faculty") {
    return "/UsersUI/UsersDashBoard";
  }
  return "/RAStaffUI/RAStaffDashBoard";
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const matchedPath = Object.keys(roleAccess).find((path) =>
    pathname.startsWith(path)
  );

  const isAuthPage = authPages.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!matchedPath && !isAuthPage) return NextResponse.next();

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    if (matchedPath) {
      return redirectToLogin(request);
    }
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(
      token,
      JWT_SECRET
    );

    const rawRole = payload.role as string | undefined;
    const role = rawRole ? normalizeRole(rawRole) : undefined;

    if (isAuthPage && role) {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }

    if (matchedPath) {
      const allowedRoles = roleAccess[matchedPath];
      if (!role || !allowedRoles.includes(role)) {
        return redirectToLogin(request);
      }
    }

    return NextResponse.next();
  } catch {
    const response = matchedPath
      ? redirectToLogin(request)
      : NextResponse.next();
    return clearAuthCookie(response);
  }
}

export const config = {
  matcher: [
    "/AdminUI/:path*",
    "/UsersUI/:path*",
    "/RAStaffUI/:path*",
    "/Login",
    "/signup/:path*",
    "/forgot-password/:path*",
  ],
};
