# 🚀 CrowdFund Protocol

A state-of-the-art, responsive decentralized crowdfunding platform built with a Next.js frontend integrated with a **Soroban Smart Contract** on the **Stellar Testnet**. This platform enables anyone to launch on-chain fundraising campaigns, receive XLM donations from across the globe, and withdraw funds or claim refunds—all governed transparently and immutably by Soroban smart contracts.

🌐 **Live Deployment**: [https://crowdfunding-protocol.vercel.app/](https://crowdfunding-protocol.vercel.app/)

---

## 📸 Screenshots

> Connect your Freighter wallet, browse campaigns, and track live on-chain activity—all from one dashboard.

| Dashboard | Stellar Expert Explorer |
|---|---|
| ![Dashboard](photos/dashboard.png) | ![Stellar Expert Explorer](photos/steller-expert.png) |

---

## 🔗 Contract Explorer & Credentials

| Resource | Value / Link |
|---|---|
| **Contract ID** | `CDD2XL5ZSING7YMTJNPE76KJG5WWRUDRZUAJV7WH6TCYSDEC5HSRP53W` |
| **Stellar Expert Explorer** | [View Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDD2XL5ZSING7YMTJNPE76KJG5WWRUDRZUAJV7WH6TCYSDEC5HSRP53W) |
| **Deployer Wallet Address** | `GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX` |
| **Network** | Stellar Testnet |
| **RPC URL** | `https://soroban-testnet.stellar.org` |
| **Horizon URL** | `https://horizon-testnet.stellar.org` |

---

## ✨ Features

- 🎯 **Campaign Creation**: Any connected wallet can launch a crowdfunding campaign with a goal (in XLM), deadline, title, and description — all recorded on-chain.
- 💸 **XLM Donations**: Donors can contribute XLM to any active campaign directly through Soroban smart contract invocations.
- 🔒 **Trustless Fund Release**: Campaign creators can only withdraw funds after the goal is met AND the deadline has passed — enforced by the contract.
- 🔄 **Automatic Refunds**: If a campaign expires without reaching its goal, donors can claim a full refund from the smart contract.
- 🔔 **Live Event Polling**: Autonomous 5-second polling of the Soroban RPC `getEvents` endpoint keeps the activity feed populated with real-time on-chain events.
- 💼 **Multi-Wallet Integration**: Full wallet selection modal using `StellarWalletsKit`, supporting Freighter, xBull, Albedo, Rabet, and more.
- 📊 **Real-Time Progress Bars**: Campaign funding progress is calculated live from on-chain data and displayed with animated progress bars.
- 🗂️ **Transaction History**: A personal transaction log tracks every create, donate, withdraw, and refund action tied to the connected wallet.
- 🌗 **Dark Glassmorphism UI**: Premium dark-mode interface with glassmorphic cards, gradient text, micro-animations, and neon glow effects.

---

## ⚙️ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 15 (App Router) |
| **Styling & Theme** | Tailwind CSS v3 (custom dark glassmorphism design system) |
| **State Management** | Zustand (wallet, transactions, and events stores) |
| **Data Fetching** | TanStack Query / React Query v5 |
| **Blockchain Connectivity** | `@stellar/stellar-sdk` v13 & `@creit.tech/stellar-wallets-kit` |
| **Smart Contract** | Soroban Rust SDK v22 — compiled to `wasm32-unknown-unknown` |
| **UI Primitives** | Radix UI (dialogs, selects, progress, tabs, tooltips) |
| **Animations** | Framer Motion |
| **Notifications** | Sonner (toast system) |

---

## 📂 Project Structure

```
crowdfunding-protocol/
├── app/
│   ├── layout.tsx              # Root layout, providers, metadata, global fonts
│   ├── page.tsx                # Landing page — hero, stats, feature cards, CTA
│   ├── campaigns/
│   │   ├── page.tsx            # Campaign grid with search, filter, and create modal
│   │   └── [id]/page.tsx       # Campaign detail — donate, withdraw, refund, donors
│   ├── dashboard/              # Wallet-connected dashboard with personal stats
│   ├── activity/               # Live on-chain event feed (5s polling)
│   └── transactions/           # Personal transaction history log
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Top navigation bar with breadcrumb & wallet status
│   │   └── Sidebar.tsx         # Fixed left sidebar with nav links & network badge
│   ├── wallet/
│   │   └── WalletConnect.tsx   # Connect/disconnect button & wallet info display
│   ├── campaigns/              # Campaign card, create form, donation modal
│   └── activity/               # Event feed cards & real-time indicators
│
├── contracts/
│   └── crowdfund/              # Rust Soroban smart contract
│       ├── Cargo.toml          # Contract dependencies (soroban-sdk v22)
│       └── src/
│           ├── lib.rs          # Core contract logic (create, donate, withdraw, refund)
│           ├── types.rs        # Campaign, Donation, CampaignStatus types
│           ├── events.rs       # On-chain event emission helpers
│           ├── storage.rs      # Storage key definitions
│           └── error.rs        # Contract error codes
│
├── hooks/
│   ├── useCampaigns.ts         # useQuery + useMutation for all campaign operations
│   ├── useEvents.ts            # Polling hook for Soroban contract events
│   └── useWallet.ts            # Wallet connection and balance hooks
│
├── lib/
│   ├── stellar/
│   │   ├── contract.ts         # Soroban RPC calls, simulation, tx submission
│   │   ├── wallet-kit.ts       # StellarWalletsKit initialization & signing
│   │   └── config.ts           # Network config, RPC URLs, constants
│   └── utils.ts                # Class merging, XLM ↔ stroops converters, formatters
│
├── store/
│   ├── wallet-store.ts         # Zustand wallet state (address, balance, connection)
│   ├── transaction-store.ts    # Zustand tx history (pending, success, failed)
│   └── event-store.ts          # Zustand event feed cache
│
├── types/
│   └── index.ts                # Campaign, Donation, ContractEvent, UI type definitions
│
├── postcss.config.js           # PostCSS config for Tailwind CSS processing
├── tailwind.config.ts          # Tailwind theme extensions (colors, gradients, animations)
├── tsconfig.json               # TypeScript config (target: ES2020 for BigInt support)
└── next.config.ts              # Next.js config (serverExternalPackages for stellar-sdk)
```

---

## 🚀 Setup & Local Execution

### Prerequisites

- **Node.js** v18 or higher
- **Freighter** browser extension configured for **Testnet** (or any Stellar-compatible wallet)
- **Rust** + `wasm32-unknown-unknown` target *(only if compiling the contract yourself)*

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/crowdfunding-protocol.git
cd crowdfunding-protocol
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create or verify the `.env.local` file at the project root:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_CROWDFUND_CONTRACT_ID=YOUR_DEPLOYED_CONTRACT_ID_HERE
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_DEPLOYER_ADDRESS=GDOJIEIHOEUCXZMHGVZOA2V2WZMP7QVXAV42M76QNDKQYEPJDO7V3ARX
NEXT_PUBLIC_NATIVE_TOKEN_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

> **Note:** If `NEXT_PUBLIC_CROWDFUND_CONTRACT_ID` is left empty, the app runs with built-in mock campaign data so you can explore the UI without a live contract.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

> **Windows Users:** If `npm` is blocked by PowerShell's execution policy, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> Or launch from **Command Prompt** (`cmd`) instead.

### 5. Build for Production

```bash
npm run build
npm run start
```

---

## 📜 Smart Contract — Soroban (Rust)

The contract lives in `contracts/crowdfund/` and is compiled to WebAssembly for the Stellar network.

### Contract Functions

| Function | Parameters | Description |
|---|---|---|
| `create_campaign` | `creator, title, description, goal, deadline` | Creates a new on-chain campaign |
| `donate` | `campaign_id, donor, amount` | Donates XLM stroops to a campaign |
| `withdraw` | `campaign_id, creator` | Withdraws funds from a successful campaign |
| `refund` | `campaign_id, donor` | Claims refund from an expired unfunded campaign |
| `get_campaign` | `id` | Returns a single campaign by ID |
| `get_campaigns` | `start_id, limit` | Returns a paginated list of campaigns |
| `get_donations` | `campaign_id` | Returns all donations for a campaign |
| `get_campaign_count` | *(none)* | Returns the total number of campaigns created |

### Campaign Status States

| Status | Condition |
|---|---|
| `Active` | Deadline not reached, goal not yet met |
| `Successful` | Goal amount reached (withdrawal unlocked) |
| `Expired` | Deadline passed without reaching goal (refunds unlocked) |
| `Withdrawn` | Creator has successfully withdrawn the funds |

### Compile & Deploy the Contract

```bash
# Install Rust target
rustup target add wasm32-unknown-unknown

# Build the contract
cd contracts/crowdfund
cargo build --target wasm32-unknown-unknown --release

# Deploy to Stellar Testnet (requires Stellar CLI)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/crowdfund.wasm \
  --network testnet \
  --source YOUR_DEPLOYER_SECRET_KEY

# Paste the returned Contract ID into .env.local
```

---

## 🔄 Core User Flow

1. **Connect Wallet** — Click **Connect Wallet** in the top navbar and select your Stellar wallet (Freighter recommended). The app reads your XLM balance from Horizon.
2. **Browse Campaigns** — Navigate to `/campaigns` to view all active, successful, and expired campaigns fetched live from the Soroban contract.
3. **Create a Campaign** — Click **+ New Campaign**, fill in the title, description, funding goal (XLM), and duration. Sign the Soroban transaction in your wallet.
4. **Donate to a Campaign** — Open any active campaign, enter an XLM amount, and click **Donate**. The contract receives the funds in escrow.
5. **Withdraw Funds** — If you are the campaign creator and the goal was met, click **Withdraw** to release the funds to your wallet.
6. **Claim Refund** — If a campaign expired without reaching its goal, donors can click **Claim Refund** to recover their XLM.
7. **Monitor Activity** — Visit `/activity` to view a live event stream of all contract events (campaign created, donations, withdrawals, refunds) polled every 5 seconds.
8. **Transaction History** — Visit `/transactions` for a personal log of every transaction you have submitted through the platform.

---

## 🧩 On-Chain Events

The contract emits the following events, captured by the live activity feed:

| Event Type | Trigger |
|---|---|
| `campaign_created` | A new campaign is successfully created |
| `donation_made` | A donor contributes XLM to a campaign |
| `funds_withdrawn` | A creator withdraws from a successful campaign |
| `refund_issued` | A donor receives a refund from an expired campaign |

---

## 🌐 Wallet Support

Powered by [`@creit.tech/stellar-wallets-kit`](https://github.com/Creit-Tech/Stellar-Wallets-Kit):

- 🟠 **Freighter** *(recommended)*
- 🔵 **xBull**
- ⚪ **Albedo**
- 🟣 **Rabet**
- 🟤 **WalletConnect**

---

## 🛠️ Error Handling

The app gracefully handles the following wallet and contract errors:

| Error | User Message Shown |
|---|---|
| Wallet not installed | "Please install [WalletName] to continue" |
| User rejected transaction | "Transaction was cancelled" |
| Insufficient XLM balance | "Insufficient balance for this transaction" |
| Contract simulation failed | Displays the decoded Soroban error message |
| Transaction timed out | "Transaction timed out after 30 seconds" |

---

## 📄 License

MIT License — free to use, fork, and build upon.

---

*Built on the Stellar blockchain with ❤️ using Soroban smart contracts.*
