// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * A production-oriented Scoreboard for a multi-flag CTF using ZK proofs.
 * This example references an external Verifier contract (IVerifier).
 */

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// If you have a generated Verifier from snarkJS, import or declare it here:
// import "./Verifier.sol"; 
interface IVerifier {
    function verifyProof(
        uint256[8] calldata proof,
        uint256[] calldata pubSignals
    ) external view returns (bool);
}

contract Scoreboard is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    // ================= Events =================
    event SubFlagProved(address indexed player, uint256 indexed index, uint256 points);
    event MasterKeyRevealed(address indexed player, string masterKey, uint256 bonusAwarded);

    // ================= State Variables =================
    
    // The verifying contract (auto-generated from snarkJS), set once in constructor.
    IVerifier public immutable verifier;

    // Number of sub-flags
    uint256 public immutable N;

    // Master key commitment (hashed via keccak256)
    bytes32 public immutable masterKeyCommitment;

    // Sub-flag commitments, stored in an array
    uint256[] public commitments;

    // Scoring
    uint256 public immutable basePointsPerFlag;
    uint256 public immutable finalBonus;

    // Each player's progress: how many sub-flags have they proven?
    mapping(address => uint256) public progress;

    // Each player's total score
    mapping(address => uint256) public score;

    // Replay protection: track last used nonce
    mapping(address => uint256) public lastNonce;

    // Track players who completed the final master key reveal
    EnumerableSet.AddressSet private _finishedPlayers;

    // ============ Constructor ============
    constructor(
        address _verifier,
        uint256 _N,
        uint256 _basePoints,
        uint256 _finalBonus,
        bytes32 _masterKeyCommitment,
        uint256[] memory _commitments
    ) {
        require(_verifier != address(0), "Verifier cannot be zero address");
        require(_commitments.length == _N, "Mismatch length");

        verifier = IVerifier(_verifier);
        N = _N;
        basePointsPerFlag = _basePoints;
        finalBonus = _finalBonus;
        masterKeyCommitment = _masterKeyCommitment;

        for (uint256 i = 0; i < _N; i++) {
            commitments.push(_commitments[i]);
        }
    }

    // ============ Public Functions ============

    /**
     * @dev Submit proof for sub-flag #i (1-based).
     * @param i Index of the sub-flag (must be progress[player] + 1).
     * @param nonce Strictly greater than lastNonce[player].
     * @param proof The Groth16 proof: [A_x, A_y, B_x_1, B_x_2, B_y_1, B_y_2, C_x, C_y].
     * @param pubSignals [ commitment ] in Groth16; if multiple signals, pass them all.
     */
    function submitSubFlagProof(
        uint256 i,
        uint256 nonce,
        uint256[8] calldata proof,
        uint256[] calldata pubSignals
    ) external {
        // Basic checks
        require(nonce > lastNonce[msg.sender], "Nonce replay");
        lastNonce[msg.sender] = nonce;

        require(i == progress[msg.sender] + 1, "Invalid sub-flag index");
        require(i <= N, "No such sub-flag");

        // 1) Confirm the public input matches the known commitment.
        require(pubSignals.length == 1, "Expected 1 pubSignal");
        require(pubSignals[0] == commitments[i - 1], "Mismatched commitment");

        // 2) Verify the proof off the Verifier contract
        bool valid = verifier.verifyProof(proof, pubSignals);
        require(valid, "Invalid ZK proof");

        // 3) Update progress & scoring
        progress[msg.sender] = i;
        score[msg.sender] += basePointsPerFlag;

        emit SubFlagProved(msg.sender, i, basePointsPerFlag);
    }

    /**
     * @dev Reveal the master key once all sub-flags are solved. 
     * @param masterKey The plaintext that should match masterKeyCommitment via keccak256.
     * @param nonce Must be > lastNonce[player].
     */
    function revealMasterKey(string calldata masterKey, uint256 nonce) external {
        require(nonce > lastNonce[msg.sender], "Nonce replay");
        lastNonce[msg.sender] = nonce;

        require(progress[msg.sender] == N, "Not all sub-flags proven");

        bytes32 hashed = keccak256(abi.encodePacked(masterKey));
        require(hashed == masterKeyCommitment, "Wrong master key");

        // Award final bonus
        score[msg.sender] += finalBonus;
        _finishedPlayers.add(msg.sender);

        emit MasterKeyRevealed(msg.sender, masterKey, finalBonus);
    }

    // ============ View Functions ============

    function hasFinished(address player) external view returns (bool) {
        return _finishedPlayers.contains(player);
    }

    function getFinishedPlayers() external view returns (address[] memory) {
        return _finishedPlayers.values();
    }
}
