import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected routes
const protectedRoutes = createRouteMatcher([
  '/game(.*)', // Protect the game route
  '/lobby(.*)', // Protect lobby route
]);

// Define public routes
const publicRoutes = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/create-game(.*)',
  '/sign-up-guest(.*)', 
  '/profile-setup(.*)' // Make profile setup public
]);

export default clerkMiddleware(async (auth, req) => {
  if (publicRoutes(req)) {
    return; // Allow access to public routes
  }

  // Handle guest users accessing /join
  if (req.nextUrl.pathname.startsWith('/join')) {
    // Extract the code parameter
    const url = new URL(req.nextUrl);
    const code = url.searchParams.get('code');
    
    if (code) {
      // Redirect directly to profile setup with the code
      const profileSetupUrl = new URL('/profile-setup', req.nextUrl.origin);
      profileSetupUrl.searchParams.set('code', code);
      return NextResponse.redirect(profileSetupUrl);
    } else {
      // No code provided, redirect to home
      return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    }
  }

  if (protectedRoutes(req)) {
    await auth.protect(); // Enforce authentication for protected routes
  }
}, { debug: true });

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/", "/(api|trpc)(.*)"], // Match all necessary routes
};
