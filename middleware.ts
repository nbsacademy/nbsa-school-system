import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public vs protected routes
  const isPublicPath = path === '/login' || path === '/';
  const isStudentPath = path.startsWith('/student');
  const isTeacherPath = path.startsWith('/teacher');
  const isAdminPath = path.startsWith('/admin');

  // Retrieve user auth role from cookies
  const userRole = request.cookies.get('user_role')?.value;

  // 1. Redirect unauthenticated users trying to access protected portals to login
  if (!userRole && (isStudentPath || isTeacherPath || isAdminPath)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Prevent logged in users from re-visiting login page
  if (userRole && isPublicPath) {
    if (userRole === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    if (userRole === 'teacher') return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
    if (userRole === 'student') return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }

  // 3. Strict Role-Based Route Protection
  if (userRole === 'student' && (isAdminPath || isTeacherPath)) {
    return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }

  if (userRole === 'teacher' && (isAdminPath || isStudentPath)) {
    return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
  }

  if (userRole === 'admin' && (isStudentPath || isTeacherPath)) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/student/:path*',
    '/teacher/:path*',
    '/admin/:path*',
  ],
};