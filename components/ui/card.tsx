// components/ui/card.tsx
import { ReactNode } from "react";

interface CardProps {
  title: string;
  icon: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, icon, children, className = "" }: CardProps) {
  return (
    <section 
      className={`group p-6 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </span>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}