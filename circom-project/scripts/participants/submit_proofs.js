// scripts/participant/submit_proof.js

require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const { performance } = require("perf_hooks");

async function main() {
  // 1. Fetch scoreboard address from environment
  const scoreboardAddr = process.env.SCOREBOARD_ADDRESS;

  // 2. Load previously generated proof and public data
  const proofData = JSON.parse(fs.readFileSync("proof.json"));
  const pubData = JSON.parse(fs.readFileSync("public.json"));

  // 3. Accept command-line arguments
  //    e.g. "node submit_proof.js 5 --parallel" => 5 proofs, concurrency
  const numProofs = process.argv[2] || 1;      // number of proofs to submit
  const parallel = process.argv.includes("--parallel");

  // 4. Attach to Scoreboard contract
  const scoreboardFactory = await ethers.getContractFactory("Scoreboard");
  const scoreboard = scoreboardFactory.attach(scoreboardAddr);

  // 5. Format the proof inputs
  //    This block aligns with the typical Groth16 proof format: [pi_a, pi_b, pi_c] each as BigNumbers
  const proof = [
    ethers.BigNumber.from(proofData.pi_a[0]).toString(),
    ethers.BigNumber.from(proofData.pi_a[1]).toString(),
    ethers.BigNumber.from(proofData.pi_b[0][1]).toString(),
    ethers.BigNumber.from(proofData.pi_b[0][0]).toString(),
    ethers.BigNumber.from(proofData.pi_b[1][1]).toString(),
    ethers.BigNumber.from(proofData.pi_b[1][0]).toString(),
    ethers.BigNumber.from(proofData.pi_c[0]).toString(),
    ethers.BigNumber.from(proofData.pi_c[1]).toString()
  ];

  // 6. Usually we have at least one public input (commitment) in public.json
  const pubSignals = [ ethers.BigNumber.from(pubData[0]).toString() ];

  // 7. Prepare benchmark tracking
  const results = {
    totalGas: 0,
    totalTime: 0,
    successes: 0,
    failures: 0,
    transactions: []
  };

  // 8. Start timing
  const startTime = performance.now();

  // 9. Submit proofs in a loop
  for (let i = 0; i < numProofs; i++) {
    const txStart = performance.now();
    try {
      // sub-flag index = 1; nonce = i+1; pass the proof + pubSignals
      const tx = await scoreboard.submitSubFlagProof(1, i + 1, proof, pubSignals);
      const receipt = await tx.wait();    // wait for mining

      // measure time and gas
      const duration = performance.now() - txStart;
      results.totalGas += Number(receipt.gasUsed);
      results.totalTime += duration;
      results.successes++;

      results.transactions.push({
        nonce: i + 1,
        gasUsed: receipt.gasUsed.toString(),
        duration: duration.toFixed(2) + "ms",
        status: "success"
      });

    } catch (error) {
      results.failures++;
      results.transactions.push({
        nonce: i + 1,
        error: error.message,
        status: "failed"
      });
    }

    // If not running in parallel mode, throttle by 100 ms
    if (!parallel) await new Promise(r => setTimeout(r, 100));
  }

  // 10. Calculate final metrics
  const totalDuration = performance.now() - startTime;
  const avgGas = results.successes ? results.totalGas / results.successes : 0;
  const avgTime = results.successes ? results.totalTime / results.successes : 0;
  const tps = results.successes / (totalDuration / 1000);

  // 11. Print summary
  console.log(`
================ Proof Submission Metrics ================
  Network:          ${hre.network.name.toUpperCase()}
  Proofs Attempted: ${numProofs}
  Success Rate:     ${(results.successes / numProofs * 100).toFixed(2)}%

  Gas Usage:
  - Total Gas:      ${results.totalGas}
  - Avg per Proof:  ${avgGas.toFixed(0)} gas

  Timing:
  - Total Time:     ${totalDuration.toFixed(2)}ms
  - Avg per Proof:  ${avgTime.toFixed(2)}ms
  - Throughput:     ${tps.toFixed(2)} TPS

  Transaction Hashes: ${results.transactions.filter(t => t.status === "success").length} successful
==========================================================
`);

  // 12. Optionally log each transaction if DEBUG is set
  if (process.env.DEBUG) {
    console.table(results.transactions);
  }
}

main().catch(console.error);

