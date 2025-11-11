// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// --- PUBLIC ROUTES (no Clerk required) ---
const isPublicRoute = createRouteMatcher([
  "/",                     // homepage
  "/api/emotion/ws",   // emotion streaming WS
  "/api/emotion/ingest",   // device-key emotion ingestion
  "/api/iot/ingest",       // device-key IoT ingestion
]);

export default clerkMiddleware(async (auth, req) => {
  // If route is public → allow through
  if (isPublicRoute(req)) return;

  // Otherwise → protect using Clerk
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next internals + static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
