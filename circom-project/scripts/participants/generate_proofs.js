// scripts/participant/generate_proofs.js

const { execSync } = require('child_process');
const { performance, PerformanceObserver } = require('perf_hooks');
const fs = require('fs');
const os = require('os');
const path = require('path');

// 1. Configuration (align with your circuit parameters)
const CIRCUIT_NAME = 'SubFlagCheck';
const NUM_CHUNKS = 3;           // Matches "component main = SubFlagCheck(3)" in your .circom
const MAX_CONCURRENCY = os.cpus().length;  // Auto-detect CPU cores
const ARTIFACT_DIR = path.join(__dirname, '../../circuits');
const PROOF_OUTPUT_DIR = path.join(__dirname, '../proofs');

// 2. Initialize performance tracking
const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach(entry => {
    console.log(`Proof ${entry.name}: ${entry.duration.toFixed(2)}ms`);
  });
});
perfObserver.observe({ entryTypes: ['measure'] });

/**
 * generateProof
 * Creates a sub-flag proof by:
 *   1) Writing input.json with chunked sub-flag + commitment
 *   2) Running "snarkjs wtns calculate" to produce witness
 *   3) Running "snarkjs plonk prove" to produce proof.json & public.json
 *
 * @param {string} subFlag - The sub-flag (e.g., "CTF-abc123")
 * @param {string|number} commitment - The challenge commitment ID
 * @param {number} index - Proof index (used for directory naming)
 */
async function generateProof(subFlag, commitment, index) {
  const workDir = path.join(PROOF_OUTPUT_DIR, `proof_${index}`);
  fs.mkdirSync(workDir, { recursive: true });

  // 1. Prepare input.json matching your circuit structure
  const chunks = chunkSubFlag(subFlag, NUM_CHUNKS);
  const input = {
    subFlagChunk: chunks,
    commitment: commitment
  };
  fs.writeFileSync(path.join(workDir, 'input.json'), JSON.stringify(input));

  // 2. Generate witness (snarkjs wtns calculate)
  performance.mark(`witnessStart-${index}`);
  execSync(
    `snarkjs wtns calculate ` +
    `${ARTIFACT_DIR}/${CIRCUIT_NAME}.wasm ` +
    `${workDir}/input.json ` +
    `${workDir}/witness.wtns`,
    { stdio: 'inherit' }
  );
  performance.mark(`witnessEnd-${index}`);
  performance.measure(`Witness ${index}`, `witnessStart-${index}`, `witnessEnd-${index}`);

  // 3. Generate proof using Plonk (snarkjs plonk prove)
  performance.mark(`proofStart-${index}`);
  execSync(
    `snarkjs plonk prove ` +
    `${ARTIFACT_DIR}/${CIRCUIT_NAME}.zkey ` +
    `${workDir}/witness.wtns ` +
    `${workDir}/proof.json ` +
    `${workDir}/public.json`,
    { stdio: 'inherit' }
  );
  performance.mark(`proofEnd-${index}`);
  performance.measure(`Proof ${index}`, `proofStart-${index}`, `proofEnd-${index}`);

  return workDir;
}

/**
 * chunkSubFlag
 * Splits a sub-flag string into multiple 64-bit "chunks" (as BigInts)
 * so it matches the circuit's input format (NUM_CHUNKS).
 *
 * @param {string} flag - The sub-flag to chunk
 * @param {number} numChunks - How many chunks to split into
 * @returns {string[]} - Array of numeric strings representing each chunk
 */
function chunkSubFlag(flag, numChunks) {
  // Convert the flag to a hex string
  const hexString = Buffer.from(flag).toString('hex');
  const chunkSize = Math.ceil(hexString.length / numChunks);
  const chunks = [];
  
  for (let i = 0; i < numChunks; i++) {
    const chunk = hexString.substr(i * chunkSize, chunkSize);

    // Pad to ensure consistent size, then interpret as BigInt
    chunks.push(BigInt('0x' + chunk.padEnd(16, '0')).toString());
  }
  
  return chunks;
}

// 3. Example sub-flags for demonstration (replace with real data in production)
const testSubFlags = [
  {
    flag: "CTF-abc123",        // In production, you'd have real solved sub-flags
    commitment: "43523452345"  // Must match the scoreboard's known commitments
  },
  // Add more objects if you want to test concurrency with multiple sub-flags
];

/**
 * main
 * Orchestrates the entire proof generation process:
 *   - Runs proof generation tasks in parallel up to MAX_CONCURRENCY
 *   - Records total time, average time, concurrency, memory usage
 */
async function main() {
  const startTime = performance.now();
  
  // We'll store promises up to MAX_CONCURRENCY
  const concurrencyPool = [];
  for (const [index, { flag, commitment }] of testSubFlags.entries()) {
    const promise = generateProof(flag, commitment, index)
      .then(() => console.log(`Proof ${index} completed`))
      .catch(err => console.error(`Proof ${index} failed:`, err));
    
    concurrencyPool.push(promise);
    if (concurrencyPool.length >= MAX_CONCURRENCY) {
      // Wait for at least one proof to finish before starting another
      await Promise.race(concurrencyPool);
    }
  }

  // Once all started, wait for them to complete
  await Promise.all(concurrencyPool);
  
  const totalTime = performance.now() - startTime;
  console.log(`
    ========== Benchmark Summary ==========
    Total proofs: ${testSubFlags.length}
    Total time: ${totalTime.toFixed(2)}ms
    Avg time/proof: ${(totalTime / testSubFlags.length).toFixed(2)}ms
    Max concurrency: ${MAX_CONCURRENCY}
    CPU cores: ${os.cpus().length}
    Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB
  `);
}

// 4. Ensure the proof output directory exists
fs.mkdirSync(PROOF_OUTPUT_DIR, { recursive: true });

// 5. Run main
main().catch(console.error);

