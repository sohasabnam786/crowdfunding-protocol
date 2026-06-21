"use client";

import { useState } from "react";
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, Check, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { cn, shortAddress, copyToClipboard, explorerAccountUrl } from "@/lib/utils";

export function WalletConnect() {
  const { isConnected, address, balance, isConnecting, error, connect, disconnect } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <button
        id="wallet-connect-btn"
        onClick={connect}
        disabled={isConnecting}
        className="btn-stellar"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin relative z-10" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4 relative z-10" />
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        id="wallet-dropdown-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all",
          "border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07]",
          showDropdown && "bg-white/[0.07] border-white/[0.12]"
        )}
      >
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full bg-stellar-gradient flex-shrink-0" />

        {/* Address */}
        <span className="text-sm font-mono text-foreground/90 hidden sm:block">
          {shortAddress(address!, 4)}
        </span>

        {/* Balance */}
        {balance && (
          <span className="text-xs text-muted-foreground hidden md:block">
            {parseFloat(balance).toFixed(2)} XLM
          </span>
        )}

        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            showDropdown && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          <div
            id="wallet-dropdown"
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/[0.08] bg-card/90 backdrop-blur-xl shadow-card z-50 overflow-hidden animate-fade-in"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-stellar-gradient flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Connected</p>
                  <div className="flex items-center gap-1">
                    <div className="dot-active" />
                    <span className="text-xs text-muted-foreground">Testnet</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <span className="text-xs font-mono text-foreground/80 flex-1 truncate">
                  {address}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Balance */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className="text-2xl font-bold gradient-text">
                {balance ? parseFloat(balance).toFixed(4) : "—"}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  XLM
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="px-2 py-2 space-y-1">
              <a
                href={explorerAccountUrl(address!)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </a>

              <button
                id="wallet-disconnect-btn"
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
