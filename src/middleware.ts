import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes
const protectedRoutes = createRouteMatcher([
  '/game(.*)' // Protect the game route
]);

// Define public routes
const publicRoutes = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/profile-setup(.*)' // Allow access to profile setup page
]);

export default clerkMiddleware(async (auth, req) => {
  if (publicRoutes(req)) {
    return; // Allow access to public routes
  }

  if (protectedRoutes(req)) {
    await auth.protect(); // Enforce authentication for protected routes
  }
}, { debug: true });

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/", "/(api|trpc)(.*)"], // Match all necessary routes
};
