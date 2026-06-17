import React from "react";
import { Link } from "react-router-dom";
import { ASSETS } from "@/lib/api";
import MarketingHeader from "@/components/Layout/MarketingHeader";
import { Waves, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="relative min-h-screen text-white">
      <MarketingHeader />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden grain">
        <img
          src={ASSETS.hero}
          alt="Nexora Resort aerial"
          className="absolute inset-0 h-full w-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_30%,rgba(0,0,0,0)_0%,rgba(0,0,0,.65)_100%)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-20 text-center">
          <img src={ASSETS.logo} alt="Nexora" className="mx-auto h-20 w-20 mb-7 nx-rise" />
          <div className="nx-rise-2 text-[11px] uppercase tracking-[0.45em] text-white/60 mb-6">
            Nexora Resorts — Established for the discerning
          </div>
          <h1 className="nx-rise-2 font-serif text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight">
            A private island,<br/>
            <span className="italic text-nx-gold">curated</span> for your community.
          </h1>
          <p className="nx-rise-3 mt-7 text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            One platform for reservations, staff operations, and community management — refined,
            secure, and built around your team.
          </p>
          <div className="nx-rise-4 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              data-testid="hero-discord-cta"
              className="btn-discord rounded-md px-7 py-3.5 text-sm font-medium inline-flex items-center gap-2"
            >
              Sign in with Discord <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#experience"
              className="text-sm text-white/70 hover:text-white inline-flex items-center gap-2 underline-offset-8 hover:underline"
              data-testid="hero-learn-more"
            >
              Learn more
            </a>
          </div>
        </div>

        <div className="absolute bottom-6 inset-x-0 z-10 text-center text-[10px] uppercase tracking-[0.4em] text-white/40">
          nexoraresorts.cloud
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience" className="relative bg-[var(--bg)] py-24 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-10">
          {[
            { icon: Waves, kicker: "Hospitality", title: "Reservations, refined.", body: "Members reserve suites through the website or directly inside Discord. The bot confirms with a private embed and two actions: enter the resort, or cancel." },
            { icon: ShieldCheck, kicker: "Operations", title: "Command with discretion.", body: "Player records, punishments, authorities and ranking — all role-gated, all logged to the appropriate Discord channel." },
            { icon: Sparkles, kicker: "Stagecraft", title: "Sessions worth showing up for.", body: "Host structured training sessions with phases, attendance, grading, and promotion-ready outcomes in one place." },
          ].map((f, i) => (
            <div key={i} className="surface p-7 transition-transform hover:-translate-y-1">
              <f.icon className="h-5 w-5 text-nx-gold" />
              <div className="mt-5 text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">{f.kicker}</div>
              <h3 className="mt-2 font-serif text-2xl">{f.title}</h3>
              <p className="mt-3 text-sm text-[var(--text-2)] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SUITES */}
      <section id="suites" className="relative py-24 px-6 border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl">
          <div className="text-[11px] uppercase tracking-[0.4em] text-[var(--text-2)] mb-4">The Collection</div>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight max-w-3xl">
            Three signature stays.<br/>Each with its own quiet view.
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { name: "Ocean Suite", img: "https://images.unsplash.com/photo-1702830499141-a0634d87d6af?crop=entropy&cs=srgb&fm=jpg&q=85", note: "Beachfront. Private balcony." },
              { name: "Garden Villa", img: "https://images.unsplash.com/photo-1718942899965-4fc10607d805?crop=entropy&cs=srgb&fm=jpg&q=85", note: "Tropical landscaping." },
              { name: "Presidential Penthouse", img: "https://images.unsplash.com/photo-1776763018972-588e27bf6511?crop=entropy&cs=srgb&fm=jpg&q=85", note: "Panoramic island views." },
            ].map((s, i) => (
              <div key={i} className="surface overflow-hidden group">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={s.img} alt={s.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-5">
                  <div className="font-serif text-xl">{s.name}</div>
                  <div className="text-xs text-[var(--text-2)] mt-1">{s.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPS */}
      <section id="operations" className="relative py-24 px-6 border-t border-[var(--border)]">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-serif text-4xl sm:text-5xl">For the team behind the door.</h2>
          <p className="mt-5 text-[var(--text-2)] max-w-2xl mx-auto">
            A single operations cockpit for bookings, player records, events, sessions, ranking,
            authorities, and bot hosting — gated by precise dashboard permissions.
          </p>
          <Link
            to="/login"
            data-testid="ops-cta"
            className="btn-discord mt-9 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium"
          >
            Continue with Discord <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-10 px-6 text-center text-xs text-[var(--text-2)]">
        © {new Date().getFullYear()} Nexora Resorts. All rights reserved. ·
        <Link to="/privacy-policy" className="ml-2 hover:text-white">Privacy</Link> ·
        <Link to="/terms" className="ml-2 hover:text-white">Terms</Link>
      </footer>
    </div>
  );
}
