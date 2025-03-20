#!/usr/bin/env node
import fs from "fs";
import * as dotenv from "dotenv"; 
dotenv.config();

// Ethers v6: import needed utilities directly
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * create_commitments.js (for Ethers v6)
 * 
 * Generates or loads sub-flags, hashes them into commitments via keccak256,
 * and writes a JSON file (ctf_data.json). 
 * 
 * NOTE:
 *  - Ethers v6 is ESM-only. Your project must be "type": "module" in package.json,
 *    or this file must have a .mjs extension.
 *  - For a real ZK-friendly hash like Poseidon or MiMC, you would integrate a
 *    specialized library. keccak256 is used here for demonstration only.
 */

// Example function to create random sub-flags (alphanumeric).
function randomSubFlag(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  // 1) Choose how many sub-flags
  const N = 4;

  // 2) Generate sub-flags (for demonstration). 
  // In production, load from a secure vault or .env to keep them truly secret.
  const subFlags = [];
  for (let i = 0; i < N; i++) {
    subFlags.push(randomSubFlag());
  }

  // 3) Hash them with keccak256. 
  // We convert each flag to bytes with toUtf8Bytes, then pass to keccak256.
  const commitments = subFlags.map((flag) => {
    return keccak256(toUtf8Bytes(flag));
  });

  // 4) Create (or load) a master key
  const masterKey = process.env.MASTER_KEY || "SUPER_SECRET_MASTER_KEY";

  // 5) Hash the master key
  const masterKeyCommitment = keccak256(toUtf8Bytes(masterKey));

  // 6) Save everything to a local JSON file
  const data = {
    N,
    subFlags,            // For demonstration, but DO NOT expose in a real scenario.
    commitments,         // Public data
    masterKey,           // Typically secret—demonstration only!
    masterKeyCommitment, // Public data
  };

  fs.writeFileSync("ctf_data.json", JSON.stringify(data, null, 2));
  console.log("CTF data created and saved to ctf_data.json");
  console.log("Sub-flags (for reference only):", subFlags);
  console.log("Master key (for reference only):", masterKey);
  console.log("Commitments array:", commitments);
  console.log("Master key commitment:", masterKeyCommitment);
}

// Run
main().catch((err) => {
  console.error(err);
  process.exit(1);
});

