"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">MindEase</h1>
      <p className="text-zinc-500 max-w-md text-center">
        Multimodal Emotional Support · IoT Vitals · AI Chat · Trends
      </p>

      <SignedOut>
        <SignInButton>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">Sign In</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <Link href="/dashboard">
          <button className="bg-zinc-800 text-white px-4 py-2 rounded-xl">Go to Dashboard</button>
        </Link>
      </SignedIn>
    </main>
  );
}
