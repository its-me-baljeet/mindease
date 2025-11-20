// app/page.tsx
"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

const features = [
  { 
    icon: "📊", 
    title: "Real-time Monitoring", 
    desc: "Track emotions and vitals live" 
  },
  { 
    icon: "🤖", 
    title: "AI Support", 
    desc: "Intelligent chat assistance" 
  },
  { 
    icon: "📈", 
    title: "Trend Analysis", 
    desc: "Understand patterns over time" 
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center gap-8 p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-600/10 rounded-full blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 text-center space-y-6 animate-[fadeIn_0.5s_ease-out]">
        <div className="inline-block">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-green-400 to-blue-500 bg-clip-text text-transparent mb-2">
            MindEase
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-blue-500 to-green-500 rounded-full" />
        </div>

        <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
          Multimodal Emotional Support • IoT Vitals • AI Chat • Trends
        </p>

        <div className="flex gap-4 justify-center pt-6">
          <SignedOut>
            <SignInButton>
              <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 active:scale-95">
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Link href="/dashboard">
              <button className="px-8 py-4 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 text-white rounded-2xl font-semibold shadow-lg hover:shadow-zinc-500/30 transition-all duration-300 hover:scale-105 hover:bg-zinc-800 active:scale-95">
                Go to Dashboard
              </button>
            </Link>
          </SignedIn>
        </div>
      </div>

      {/* Feature cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl animate-[slideUp_0.6s_ease-out]">
        {features.map((feature, i) => (
          <div 
            key={i}
            className="group p-6 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl hover:border-zinc-700 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-zinc-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}