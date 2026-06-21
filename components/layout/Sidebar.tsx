"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Rocket,
  Activity,
  History,
  Zap,
  ExternalLink,
} from "lucide-react";
import { cn, shortAddress } from "@/lib/utils";
import { useWalletStore } from "@/store/wallet-store";
import { STELLAR_CONFIG, DEPLOYER_ADDRESS } from "@/lib/stellar/config";
import { explorerContractUrl } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Zap },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Rocket },
  { href: "/activity", label: "Activity Feed", icon: Activity },
  { href: "/transactions", label: "Transactions", icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isConnected, address } = useWalletStore();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-white/[0.06] bg-black/20 backdrop-blur-xl fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-stellar-gradient flex items-center justify-center flex-shrink-0">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-foreground">CrowdFund</h1>
          <p className="text-xs text-muted-foreground">Protocol</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("nav-item", isActive && "active")}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="px-4 py-4 border-t border-white/[0.06] space-y-3">
        {/* Network badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="dot-active" />
          <span className="text-xs text-muted-foreground capitalize">
            {STELLAR_CONFIG.network}
          </span>
        </div>

        {/* Contract link */}
        {STELLAR_CONFIG.contractId && (
          <a
            href={explorerContractUrl(STELLAR_CONFIG.contractId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors group"
          >
            <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <span className="text-xs text-muted-foreground font-mono flex-1 truncate">
              {shortAddress(STELLAR_CONFIG.contractId, 4)}
            </span>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
      </div>
    </aside>
  );
}
