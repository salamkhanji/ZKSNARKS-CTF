// scripts/organizer/deploy_scoreboard.js
require("dotenv").config();
const { ethers } = require("hardhat");
const { performance } = require("perf_hooks");
const fs = require("fs");

async function main() {
  // Load commitments from file (matches your project structure)
  const commitments = JSON.parse(fs.readFileSync("ctf_data.json")).commitments;
  const N = commitments.length;

  // Deployment metrics storage
  const metrics = {
    verifier: { time: 0, gas: 0 },
    scoreboard: { time: 0, gas: 0 },
    total: { time: 0, gas: 0 }
  };

  // 1. Deploy Verifier
  const verifierStart = performance.now();
  const VerifierFactory = await ethers.getContractFactory("Verifier");
  const verifier = await VerifierFactory.deploy();
  const verifierReceipt = await verifier.deployTransaction.wait();
  metrics.verifier.time = performance.now() - verifierStart;
  metrics.verifier.gas = verifierReceipt.gasUsed.toString();

  // 2. Deploy Scoreboard
  const scoreboardStart = performance.now();
  const ScoreboardFactory = await ethers.getContractFactory("Scoreboard");
  const scoreboard = await ScoreboardFactory.deploy(
    verifier.address,
    N,
    process.env.BASE_POINTS || 10,
    process.env.FINAL_BONUS || 50,
    ethers.keccak256(ethers.toUtf8Bytes(process.env.MASTER_KEY)),
    commitments
  );
  const scoreboardReceipt = await scoreboard.deployTransaction.wait();
  metrics.scoreboard.time = performance.now() - scoreboardStart;
  metrics.scoreboard.gas = scoreboardReceipt.gasUsed.toString();

  // Calculate totals
  metrics.total.time = metrics.verifier.time + metrics.scoreboard.time;
  metrics.total.gas = BigInt(metrics.verifier.gas) + BigInt(metrics.scoreboard.gas);

  // Display results
  console.log(`
    ========== Deployment Metrics ==========
    Network: ${hre.network.name.toUpperCase()}
    
    Verifier Contract:
    Time: ${metrics.verifier.time.toFixed(2)}ms
    Gas Used: ${metrics.verifier.gas}
    
    Scoreboard Contract:
    Time: ${metrics.scoreboard.time.toFixed(2)}ms
    Gas Used: ${metrics.scoreboard.gas}
    
    Total Deployment:
    Time: ${metrics.total.time.toFixed(2)}ms
    Gas Used: ${metrics.total.gas.toString()}
  `);

  // Write addresses to file (existing functionality)
  fs.writeFileSync("deployments.json", JSON.stringify({
    verifier: verifier.address,
    scoreboard: scoreboard.address
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
});
