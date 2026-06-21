"use client";

import { useCallback } from "react";
import { useWalletStore } from "@/store/wallet-store";
import {
  openWalletModal,
  signTransaction,
  disconnectWallet,
  setActiveWallet,
  getConnectedAddress,
} from "@/lib/stellar/wallet-kit";
import { fetchXlmBalance } from "@/lib/stellar/contract";
import { parseContractError } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// useWallet Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useWallet() {
  const store = useWalletStore();

  /** Open the wallet selection modal and connect */
  const connect = useCallback(async () => {
    store.setConnecting(true);
    store.setError(null);

    try {
      const { walletId, address } = await openWalletModal();
      store.setConnected(address, walletId);

      // Fetch balance
      const balance = await fetchXlmBalance(address);
      store.setBalance(balance);
    } catch (err) {
      const message = parseContractError(err);
      // Ignore "modal closed" errors
      if (!message.includes("closed without")) {
        store.setError(message);
      } else {
        store.setConnecting(false);
      }
    }
  }, [store]);

  /** Disconnect the current wallet */
  const disconnect = useCallback(async () => {
    await disconnectWallet();
    store.setDisconnected();
  }, [store]);

  /** Refresh the XLM balance */
  const refreshBalance = useCallback(async () => {
    if (!store.address) return;
    try {
      const balance = await fetchXlmBalance(store.address);
      store.setBalance(balance);
    } catch {
      // Ignore balance fetch errors
    }
  }, [store]);

  /** Restore wallet from persisted state on page load */
  const restoreWallet = useCallback(async () => {
    if (!store.isConnected || !store.walletId) return;

    try {
      setActiveWallet(store.walletId);
      const address = await getConnectedAddress();

      if (address && address === store.address) {
        const balance = await fetchXlmBalance(address);
        store.setBalance(balance);
      } else {
        // Session expired, disconnect
        store.setDisconnected();
      }
    } catch {
      store.setDisconnected();
    }
  }, [store]);

  return {
    // State
    isConnected: store.isConnected,
    address: store.address,
    balance: store.balance,
    network: store.network,
    isConnecting: store.isConnecting,
    error: store.error,

    // Actions
    connect,
    disconnect,
    refreshBalance,
    restoreWallet,

    // Signing
    sign: signTransaction,
  };
}
