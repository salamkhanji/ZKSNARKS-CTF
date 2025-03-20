pragma circom 2.2.2;
include "./node_modules/circomlib/circuits/poseidon.circom";

/*
   This circuit proves:
      Poseidon( [subFlagChunk[0], subFlagChunk[1], ..., subFlagChunk[k]] ) = commitment
   subFlagChunk[] are private inputs (the sub-flag in chunked form).
   commitment is a public input.
   This approach is more flexible for variable-length secrets.
*/
template SubFlagCheck(numChunks) {
    signal input subFlagChunk[numChunks]; // In 2.2.2, inputs are private by default
    signal input commitment; // public input
    
    // Instantiate Poseidon as a component
    component hasher = Poseidon(numChunks);
    
    // Connect inputs to the hasher
    for (var i = 0; i < numChunks; i++) {
        hasher.inputs[i] <== subFlagChunk[i];
    }
    
    // Enforce equality
    hasher.out === commitment;
}

component main = SubFlagCheck(3); 
// Example: 3 chunks. Adjust based on your maximum flag size.
