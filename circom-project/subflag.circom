pragma circom 2.2.2;

// Try this include path - adjust if needed
include "./node_modules/circomlib/circuits/poseidon.circom";

template SubFlagCheck(numChunks) {
    // In Circom 2.2.2, privacy is handled differently
    signal input subFlagChunk[numChunks]; // All inputs are private by default
    signal input commitment;
    
    component hasher = Poseidon(numChunks);
    
    for (var i = 0; i < numChunks; i++) {
        hasher.inputs[i] <== subFlagChunk[i];
    }
    
    hasher.out === commitment;
}

component main = SubFlagCheck(3);
