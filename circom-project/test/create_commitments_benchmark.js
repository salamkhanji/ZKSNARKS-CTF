// scripts/organizer/create_commitments.js
require("dotenv").config();
const { ethers } = require("ethers");
const { randomBytes } = require("crypto");
const { performance } = require("perf_hooks");

// Generate a cryptographically secure random sub-flag
function generateSubFlag() {
  return `CTF-${randomBytes(12).toString("hex")}`; // 12 bytes = 24 hex chars
}

async function main() {
  const N = process.env.N || 1000; // Number of sub-flags from .env or default
  console.log(`Generating ${N} sub-flags with keccak256 hashing...`);

  const subFlags = [];
  const commitments = [];
  
  // Start benchmarking
  const startTime = performance.now();

  for (let i = 0; i < N; i++) {
    // 1. Generate sub-flag
    const flag = generateSubFlag();
    
    // 2. Compute commitment (keccak256 hash)
    const hash = ethers.keccak256(ethers.toUtf8Bytes(flag));
    
    subFlags.push(flag);
    commitments.push(hash);
  }

  // Calculate duration
  const duration = performance.now() - startTime;

  // Output results
  console.log(`Processed ${N} sub-flags in ${duration.toFixed(2)}ms`);
  console.log(`Avg time per sub-flag: ${(duration/N).toFixed(4)}ms`);
  console.log("\nSample Sub-Flag:", subFlags[0]);
  console.log("Sample Commitment:", commitments[0]);

  // For production: Write to secure storage instead of console
  // fs.writeFileSync("secrets/subflags.json", JSON.stringify(subFlags));
  // fs.writeFileSync("commitments.json", JSON.stringify(commitments));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in commitment generation:", error);
    process.exit(1);
  });
