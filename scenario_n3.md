# File: scenario_n3.md

# ------------------------------
# Scenario: N = 3 Sub-Challenges
# ------------------------------

# Master Key
M = "MasterKey_CTF2025"
C_M = Hash(M)

# Three Sub-Challenges (S_1, S_2, S_3)
# Possibly each puzzle is a different type (crypto/web/reverse, etc.)
S_1 = "Puzzle1_Encrypted"  # Off-chain: E_{K1}(S_1)
S_2 = "Puzzle2_Encrypted"  # Off-chain: E_{K2}(S_2)
S_3 = "Puzzle3_Encrypted"  # Off-chain: E_{K3}(S_3)

# Three Sub-Flags (F_1, F_2, F_3)
F_1 = "CTF_FlagA_Example"
F_2 = "CTF_FlagB_Example"
F_3 = "CTF_FlagC_Example"

C_1 = Hash(F_1)
C_2 = Hash(F_2)
C_3 = Hash(F_3)

# ---------------
# PHASE 1: Setup
# ---------------
# 1) The challenge designer publishes C_1, C_2, C_3, and C_M on-chain.
# 2) S_i are each symmetrically encrypted with K_i -> E(S_i).
# 3) scoreboard releases K1 initially (assuming F0 is trivially solved).
# 4) Proving & Verification keys: (PK, VK) = SetupZK(lambda)
# 5) scoreboard logs basePointsPerFlag = X, finalBonus = Y

# ---------------
# PHASE 2: Proof Generation
# ---------------
# 1) Once participant decrypts S_1 with K1 -> obtains puzzle data -> solves puzzle -> obtains F_1.
# 2) Generate zero-knowledge proof: pi_1 = Prove(PK, F_1, C_1).
# 3) message m_1 = (1, pi_1, nonce, teamID)
# 4) signature sigma_1 = Sign(sk_team, m_1)
# 5) submit <1, pi_1, nonce, teamID, sigma_1> to scoreboard.

# ---------------
# PHASE 3: On-Chain Verification
# ---------------
# 1) scoreboard checks signature sigma_1 & nonce for replay protection.
# 2) enforces sequential order: progress[teamID] must be 0 if i=1.
# 3) scoreboard calls valid? = Verify(VK, pi_1, C_1)
# 4) if valid, scoreboard sets progress[teamID] = 1, awards points, releases K2
# 5) participant decrypts S_2 with K2 -> obtains F_2 -> repeats process for i=2, etc.

# ---------------
# PHASE 4: Master Key Reveal
# ---------------
# 1) after F_3 is proven, scoreboard sets progress[teamID] = 3.
# 2) participant calls revealMasterKey(M, nonce, teamID, sigma)
# 3) scoreboard checks Hash(M) == C_M, signature valid, progress=3
# 4) scoreboard awards final bonus, optionally logs M on-chain
# 5) challenge is complete for that team.

# End of scenario
