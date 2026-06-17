import React from "react";
import { Link } from "react-router-dom";
import MarketingHeader from "@/components/Layout/MarketingHeader";

function Doc({ title, children }) {
  return (
    <div className="min-h-screen text-white">
      <MarketingHeader />
      <article className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <Link to="/" className="text-xs uppercase tracking-[0.3em] text-white/50 hover:text-white">← Home</Link>
        <h1 className="font-serif text-4xl sm:text-5xl mt-4">{title}</h1>
        <div className="mt-8 prose prose-invert prose-zinc max-w-none text-[var(--text-2)] leading-relaxed space-y-4">
          {children}
        </div>
      </article>
    </div>
  );
}
export default Doc;
