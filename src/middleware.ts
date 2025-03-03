import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes
const protectedRoutes = createRouteMatcher([
  '/dashboard(.*)',
  '/forum(.*)'
]);

// Define public routes
const publicRoutes = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (publicRoutes(req)) {
    return; // Allow access to public routes
  }
  
  if (protectedRoutes(req)) {
    await auth.protect();
  }
}, {debug: true});

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/", "/(api|trpc)(.*)"],
};
