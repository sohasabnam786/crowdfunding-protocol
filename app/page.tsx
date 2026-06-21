import Link from "next/link";
import { Rocket, Shield, Zap, TrendingUp, Activity, ArrowRight, Star } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CrowdFund Protocol | Home",
  description: "Decentralized crowdfunding powered by Stellar Soroban smart contracts",
};

const FEATURES = [
  {
    icon: Shield,
    title: "Trustless & Transparent",
    description:
      "All funds are managed by Soroban smart contracts on Stellar. No intermediaries, no hidden fees, fully auditable on-chain.",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Stellar settles in 3-5 seconds. Your donation is confirmed near-instantly with minimal gas fees (< 0.001 XLM).",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    icon: TrendingUp,
    title: "Automatic Refunds",
    description:
      "If a campaign doesn't reach its goal by the deadline, the smart contract automatically enables full refunds for all donors.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: Activity,
    title: "Real-Time Events",
    description:
      "Watch donations and campaign updates stream live from the blockchain. Every event is permanently recorded on-chain.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
];

const STATS = [
  { label: "Active Campaigns", value: "4", suffix: "" },
  { label: "Total Raised", value: "33,850", suffix: " XLM" },
  { label: "Network", value: "Testnet", suffix: "" },
  { label: "Contract", value: "Soroban", suffix: "" },
];

export default function HomePage() {
  return (
    <div className="space-y-20 pb-12">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center pt-12 pb-8 gap-8">
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[200px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary animate-fade-in">
          <Star className="w-3.5 h-3.5" />
          Powered by Stellar Soroban Smart Contracts
        </div>

        {/* Headline */}
        <div className="space-y-4 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
            Fund Ideas That{" "}
            <span className="gradient-text">Change the World</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The first fully on-chain crowdfunding platform on Stellar. Launch
            campaigns, receive XLM donations, and withdraw funds—all through
            auditable Soroban smart contracts.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
          <Link href="/campaigns" id="explore-campaigns-btn" className="btn-stellar px-8 py-3 text-base">
            <Rocket className="w-5 h-5 relative z-10" />
            <span>Explore Campaigns</span>
          </Link>
          <Link href="/dashboard" id="wallet-dashboard-btn" className="btn-ghost px-8 py-3 text-base">
            Connect Wallet
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Network indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
          <div className="dot-active" />
          Running on Stellar Testnet
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(({ label, value, suffix }, i) => (
          <div
            key={label}
            className="glass-card p-6 text-center animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-3xl font-black gradient-text">
              {value}
              {suffix}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">
            Why CrowdFund Protocol?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built on Stellar's battle-tested infrastructure for speed, security,
            and accessibility.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, color, bg }, i) => (
            <div
              key={title}
              className="glass-card p-6 flex gap-5 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${bg}`}
              >
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <h3 className="font-bold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
          <p className="text-muted-foreground">
            Three simple steps to launch or fund a campaign
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Connect Wallet",
              desc: "Connect your Freighter, XBULL, or any Stellar wallet to get started. No sign-up required.",
            },
            {
              step: "02",
              title: "Create or Fund",
              desc: "Launch a campaign with a funding goal and deadline, or donate XLM to projects you believe in.",
            },
            {
              step: "03",
              title: "Track On-Chain",
              desc: "Every donation and milestone is recorded on Stellar. Watch your campaign grow in real time.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="glass-card p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-stellar-gradient flex items-center justify-center">
                <span className="font-black text-white text-sm">{step}</span>
              </div>
              <h3 className="font-bold text-base">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="glass-card p-10 md:p-14 text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-stellar-gradient opacity-5 pointer-events-none" />
        <h2 className="text-3xl md:text-4xl font-bold relative">
          Ready to Launch Your Campaign?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto relative">
          Join the decentralized crowdfunding revolution. Your idea deserves
          transparent, trustless funding.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
          <Link
            href="/campaigns"
            id="cta-launch-campaign-btn"
            className="btn-stellar px-8 py-3 text-base"
          >
            <Rocket className="w-5 h-5 relative z-10" />
            <span>Launch a Campaign</span>
          </Link>
          <Link
            href="/activity"
            id="cta-activity-feed-btn"
            className="btn-ghost px-8 py-3 text-base"
          >
            <Activity className="w-4 h-4" />
            View Live Activity
          </Link>
        </div>
      </section>
    </div>
  );
}
