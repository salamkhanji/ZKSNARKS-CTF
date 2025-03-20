// scripts/organizer/deploy_scoreboard.js
const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
  // 1) Load data from ctf_data.json
  const rawData = fs.readFileSync("ctf_data.json", "utf8");
  const {
    N,
    commitments,
    masterKeyCommitment
  } = JSON.parse(rawData);

  const basePoints = 10;
  const finalBonus = 50;

  console.log("Deploying with N =", N);

  // 2) Deploy the REAL Verifier from your Verifier.sol
  const Verifier = await ethers.getContractFactory("PlonkVerifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();
  console.log("Verifier deployed at:", verifier.address);

  // 3) Deploy Scoreboard
  const Scoreboard = await ethers.getContractFactory("Scoreboard");
  const scoreboard = await Scoreboard.deploy(
    verifier.address,     // pass the real verifier address
    N,
    basePoints,
    finalBonus,
    masterKeyCommitment,
    commitments
  );
  await scoreboard.deployed();
  console.log("Scoreboard deployed at:", scoreboard.address);

  console.log("Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

