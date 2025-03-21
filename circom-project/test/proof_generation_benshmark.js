// scripts/participant/generate_proofs.js
const { execSync } = require('child_process');
const { performance, PerformanceObserver } = require('perf_hooks');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Configuration (align with circuit parameters)
const CIRCUIT_NAME = 'subflag';
const NUM_CHUNKS = 3; // Matches component main = SubFlagCheck(3)
const MAX_CONCURRENCY = os.cpus().length; // Auto-detect CPU cores
const ARTIFACT_DIR = path.join(__dirname, '../../circuits');
const PROOF_OUTPUT_DIR = path.join(__dirname, '../proofs');

// Initialize performance tracking
const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach(entry => {
    console.log(`Proof ${entry.name}: ${entry.duration.toFixed(2)}ms`);
  });
});
perfObserver.observe({ entryTypes: ['measure'] });

async function generateProof(subFlag, commitment, index) {
  const workDir = path.join(PROOF_OUTPUT_DIR, `proof_${index}`);
  fs.mkdirSync(workDir, { recursive: true });

  // 1. Prepare input.json matching circuit structure
  const chunks = chunkSubFlag(subFlag, NUM_CHUNKS);
  const input = {
    subFlagChunk: chunks,
    commitment: commitment
  };
  fs.writeFileSync(path.join(workDir, 'input.json'), JSON.stringify(input));

  // 2. Generate witness
  performance.mark(`witnessStart-${index}`);
  execSync(
    `snarkjs wtns calculate ${ARTIFACT_DIR}/${CIRCUIT_NAME}.wasm ` +
    `${workDir}/input.json ${workDir}/witness.wtns`,
    { stdio: 'inherit' }
  );
  performance.mark(`witnessEnd-${index}`);
  performance.measure(`Witness ${index}`, `witnessStart-${index}`, `witnessEnd-${index}`);

  // 3. Generate proof using PLONK
  performance.mark(`proofStart-${index}`);
  execSync(
    `snarkjs plonk prove ${ARTIFACT_DIR}/${CIRCUIT_NAME}.zkey ` +
    `${workDir}/witness.wtns ${workDir}/proof.json ${workDir}/public.json`,
    { stdio: 'inherit' }
  );
  performance.mark(`proofEnd-${index}`);
  performance.measure(`Proof ${index}`, `proofStart-${index}`, `proofEnd-${index}`);

  return workDir;
}

function chunkSubFlag(flag, numChunks) {
  // Implementation matching your circuit's chunking logic
  const hexString = Buffer.from(flag).toString('hex');
  const chunkSize = Math.ceil(hexString.length / numChunks);
  const chunks = [];
  
  for(let i=0; i<numChunks; i++) {
    const chunk = hexString.substr(i*chunkSize, chunkSize);
    chunks.push(BigInt('0x' + chunk.padEnd(16, '0')).toString()); // 64-bit chunks
  }
  
  return chunks;
}

// Main execution (simulated sub-flags - replace with real data)
const testSubFlags = [
  {
    flag: "CTF-abc123", // Replace with actual solved sub-flag
    commitment: "43523452345" // From organizer's commitments
  },
  // Add more sub-flags for concurrent testing
];

async function main() {
  const startTime = performance.now();
  
  // Run proofs in parallel with limited concurrency
  const concurrencyPool = [];
  for(const [index, {flag, commitment}] of testSubFlags.entries()) {
    const promise = generateProof(flag, commitment, index)
      .then(() => console.log(`Proof ${index} completed`))
      .catch(err => console.error(`Proof ${index} failed:`, err));
    
    concurrencyPool.push(promise);
    if(concurrencyPool.length >= MAX_CONCURRENCY) {
      await Promise.race(concurrencyPool);
    }
  }

  await Promise.all(concurrencyPool);
  
  const totalTime = performance.now() - startTime;
  console.log(`
    ========== Benchmark Summary ==========
    Total proofs: ${testSubFlags.length}
    Total time: ${totalTime.toFixed(2)}ms
    Avg time/proof: ${(totalTime/testSubFlags.length).toFixed(2)}ms
    Max concurrency: ${MAX_CONCURRENCY}
    CPU cores: ${os.cpus().length}
    Memory usage: ${(process.memoryUsage().heapUsed/1024/1024).toFixed(2)}MB
  `);
}

// Create output directory
fs.mkdirSync(PROOF_OUTPUT_DIR, { recursive: true });

main().catch(console.error);
