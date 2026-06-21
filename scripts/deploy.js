/**
 * deploy.js - Deploy the crowdfund Soroban contract to Stellar Testnet
 * Uses @stellar/stellar-sdk v13 + Horizon for TX polling
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const sdk = require("@stellar/stellar-sdk");
const {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Operation,
  StrKey,
  Horizon,
  Address,
} = sdk;

const { Server: RpcServer, Api, assembleTransaction } = sdk.rpc;

const RPC_URL = "https://soroban-testnet.stellar.org";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

const wasmPath = path.join(
  __dirname,
  "..",
  "target",
  "wasm32-unknown-unknown",
  "release",
  "crowdfund.wasm"
);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll Horizon until TX is found and confirmed */
async function waitForHorizonTx(hash, maxAttempts = 30) {
  const url = `${HORIZON_URL}/transactions/${hash}`;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(3000);
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        const data = await res.json();
        if (data.successful === true) return data;
        if (data.successful === false) {
          throw new Error(`TX failed on Horizon: ${JSON.stringify(data.extras?.result_codes)}`);
        }
      }
    } catch (e) {
      if (e.message.startsWith("TX failed")) throw e;
      // 404 = not yet in ledger, keep waiting
    }
    process.stdout.write(".");
  }
  throw new Error(`TX ${hash} timed out`);
}

/** Poll Soroban RPC until TX result available */
async function waitForRpcTx(server, hash, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000);
    try {
      const status = await server.getTransaction(hash);
      if (status.status === "SUCCESS") return status;
      if (status.status === "FAILED") throw new Error(`RPC TX failed: ${JSON.stringify(status)}`);
      process.stdout.write(".");
    } catch (e) {
      if (e.message && (e.message.includes("Bad union") || e.message.includes("NOT_FOUND"))) {
        process.stdout.write("~");
        continue;
      }
      throw e;
    }
  }
  throw new Error(`TX ${hash} RPC timeout`);
}

async function main() {
  if (!fs.existsSync(wasmPath)) {
    console.error("❌ WASM not found at:", wasmPath);
    process.exit(1);
  }

  const wasmBytes = fs.readFileSync(wasmPath);
  console.log(`✅ Loaded WASM: ${wasmBytes.length} bytes`);

  // Compute wasm hash (SHA-256)
  const wasmHash = crypto.createHash("sha256").update(wasmBytes).digest();
  console.log(`   WASM hash: ${wasmHash.toString("hex")}`);

  // Generate deployer keypair
  const deployerKeypair = Keypair.random();
  console.log(`\n🔑 Deployer: ${deployerKeypair.publicKey()}`);

  // Fund via Friendbot
  console.log(`💰 Funding via Friendbot...`);
  const fundRes = await fetch(
    `https://friendbot.stellar.org?addr=${deployerKeypair.publicKey()}`
  );
  if (!fundRes.ok) {
    const errText = await fundRes.text();
    throw new Error("Friendbot failed: " + errText);
  }
  const fundData = await fundRes.json();
  console.log(`✅ Funded! TX: ${fundData.id || fundData.hash || "(ok)"}`);
  await sleep(4000);

  const rpc = new RpcServer(RPC_URL);
  const horizon = new Horizon.Server(HORIZON_URL);

  // ── Step 1: Upload WASM ──────────────────────────────────────────────────────
  console.log("\n📤 Uploading WASM to Stellar Testnet...");
  const account = await rpc.getAccount(deployerKeypair.publicKey());

  const uploadTx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
    .setTimeout(300)
    .build();

  const simUpload = await rpc.simulateTransaction(uploadTx);
  if (Api.isSimulationError(simUpload)) {
    throw new Error("Upload simulation error: " + simUpload.error);
  }

  const preparedUpload = assembleTransaction(uploadTx, simUpload).build();
  preparedUpload.sign(deployerKeypair);

  const uploadSend = await rpc.sendTransaction(preparedUpload);
  console.log(`   TX hash: ${uploadSend.hash}`);

  if (uploadSend.status === "ERROR") {
    throw new Error("Upload send failed: " + JSON.stringify(uploadSend.errorResult));
  }

  // Use Horizon to confirm the upload TX
  await waitForHorizonTx(uploadSend.hash);
  console.log("\n✅ WASM uploaded and confirmed on-chain!");

  // ── Step 2: Deploy Contract Instance ────────────────────────────────────────
  console.log("\n🚀 Creating contract instance...");
  await sleep(3000);

  const account2 = await rpc.getAccount(deployerKeypair.publicKey());

  const deployTx = new TransactionBuilder(account2, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        address: new Address(deployerKeypair.publicKey()),
        wasmHash: wasmHash,
        salt: Buffer.alloc(32, 0),
      })
    )
    .setTimeout(300)
    .build();

  const simDeploy = await rpc.simulateTransaction(deployTx);
  if (Api.isSimulationError(simDeploy)) {
    throw new Error("Deploy simulation error: " + simDeploy.error);
  }

  // Grab contract ID from simulation result (available before sending)
  let contractIdStrkey;
  try {
    const simResult = simDeploy;
    if (simResult.result && simResult.result.retval) {
      const retval = simResult.result.retval;
      console.log("   Sim return type:", retval.switch().name);
      if (retval.switch().name === "scvAddress") {
        const contractIdBytes = retval.address().contractId();
        contractIdStrkey = StrKey.encodeContract(contractIdBytes);
        console.log("   Contract ID (from sim):", contractIdStrkey);
      }
    }
  } catch (e) {
    console.log("   (Could not extract contract ID from sim, will try after TX)");
  }

  const preparedDeploy = assembleTransaction(deployTx, simDeploy).build();
  preparedDeploy.sign(deployerKeypair);

  const deploySend = await rpc.sendTransaction(preparedDeploy);
  console.log(`   TX hash: ${deploySend.hash}`);

  if (deploySend.status === "ERROR") {
    throw new Error("Deploy send failed: " + JSON.stringify(deploySend.errorResult));
  }

  // Confirm via Horizon
  await waitForHorizonTx(deploySend.hash);
  console.log("\n✅ Contract deployed and confirmed!");

  // If we didn't get it from sim, derive it deterministically
  if (!contractIdStrkey) {
    console.log("   Deriving contract ID deterministically...");
    const networkId = crypto
      .createHash("sha256")
      .update(NETWORK_PASSPHRASE)
      .digest();

    const deployerScAddress = new Address(deployerKeypair.publicKey()).toScAddress();

    const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
      new xdr.HashIdPreimageContractId({
        networkId: networkId,
        contractIdPreimage:
          xdr.ContractIdPreimage.contractIdPreimageFromAddress(
            new xdr.ContractIdPreimageFromAddress({
              address: deployerScAddress,
              salt: Buffer.alloc(32, 0),
            })
          ),
      })
    );

    const contractIdBytes = crypto
      .createHash("sha256")
      .update(preimage.toXDR())
      .digest();

    contractIdStrkey = StrKey.encodeContract(contractIdBytes);
  }

  console.log(`\n🎉 CONTRACT ID: ${contractIdStrkey}`);

  // ── Update .env.local ────────────────────────────────────────────────────────
  const envPath = path.join(__dirname, "..", ".env.local");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(
    /NEXT_PUBLIC_CROWDFUND_CONTRACT_ID=.*/,
    `NEXT_PUBLIC_CROWDFUND_CONTRACT_ID=${contractIdStrkey}`
  );
  if (!envContent.includes("NEXT_PUBLIC_NATIVE_TOKEN_ADDRESS")) {
    envContent = envContent.trimEnd() + "\nNEXT_PUBLIC_NATIVE_TOKEN_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC\n";
  }
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Updated .env.local`);

  // ── Update README.md ─────────────────────────────────────────────────────────
  const readmePath = path.join(__dirname, "..", "README.md");
  let readmeContent = fs.readFileSync(readmePath, "utf8");
  readmeContent = readmeContent.replace(
    /\| \*\*Contract ID\*\* \| .*\|/,
    `| **Contract ID** | \`${contractIdStrkey}\` |`
  );
  readmeContent = readmeContent.replace(
    /\[View Contract on Stellar Expert\]\([^)]+\)/,
    `[View Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/${contractIdStrkey})`
  );
  fs.writeFileSync(readmePath, readmeContent);
  console.log(`✅ Updated README.md`);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`CONTRACT ID : ${contractIdStrkey}`);
  console.log(`EXPLORER    : https://stellar.expert/explorer/testnet/contract/${contractIdStrkey}`);
  console.log(`UPLOAD TX   : ${uploadSend.hash}`);
  console.log(`DEPLOY TX   : ${deploySend.hash}`);
  console.log(`${"═".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message || err);
  process.exit(1);
});
