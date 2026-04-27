# How Kleros Works in SwaRojgar

> This is a learning document only. Do not deploy anything from here.

---

## The Big Picture

We are NOT calling a Kleros API. We are talking **directly to their smart contract** on Sepolia.

Kleros is a decentralized court — real anonymous jurors (strangers on the internet) stake PNK tokens to vote on cases. We plug into this court using two Ethereum standards:

- **ERC-792** — the arbitration standard (how to create a dispute, how to receive a ruling)
- **ERC-1497** — the evidence standard (how to attach context and evidence to a dispute via IPFS)

Our `GigEscrow.sol` contract implements both.

---

## The 3-Tier System

```
PROOF_SUBMITTED
      │
      │  either party raises dispute
      ▼
 DISPUTED_AI  ──────── Mistral LLM analyzes → setAIProposal()
      │
      │  both vote on AI verdict
      ├─── both accept ──────────────────────────► COMPLETED (pay freelancer)
      │
      │  one rejects → escalateToKleros() + pay ETH fee
      ▼
DISPUTED_KLEROS ─── real jurors vote on court.kleros.io
      │
      ├─── ruling 1 (pay freelancer) ───────────► COMPLETED
      ├─── ruling 2 (refund client)  ───────────► REFUNDED
      │
      │  ruling 0 (refuse to arbitrate) — very rare
      ▼
DISPUTED_HUMAN ─── platform owner calls humanFinalArbitration()
      │
      ├─── true  ───────────────────────────────► COMPLETED
      └─── false ───────────────────────────────► REFUNDED
```

---

## What Actually Happens Step by Step

### Step 1 — Gig Creation (MetaEvidence)

When a client creates a gig, our contract emits:

```solidity
emit MetaEvidence(evidenceId, _metaEvidenceUri);
```

`metaEvidenceUri` is an IPFS link to a JSON file (uploaded by our backend via Pinata) that describes the gig:

```json
{
  "title": "Build a React Dashboard",
  "description": "...",
  "question": "Did the freelancer deliver the agreed work?",
  "rulingOptions": {
    "titles": ["Refuse to Arbitrate", "Pay Freelancer", "Refund Client"]
  }
}
```

This JSON is what Kleros jurors will READ to understand the case. Without it, jurors have no context.

---

### Step 2 — Proof Submitted (Evidence)

When the freelancer submits proof, the contract emits:

```solidity
emit Evidence(address(arbitrator), gig.metaEvidenceID, msg.sender, ipfsHash);
```

This links the proof to the MetaEvidence. If this ever goes to Kleros, jurors will see the proof.

---

### Step 3 — Dispute Raised (AI Tier)

Either party calls `raiseDisputeAI(gigId)`. This:
- Sets status to `DISPUTED_AI`
- Emits `DisputeRaisedAI` event

Our backend catches this (or the frontend triggers it directly now) and runs Mistral to analyze the dispute. Mistral returns a verdict JSON uploaded to IPFS. Then our backend (as contract owner) calls:

```solidity
setAIProposal(gigId, proposalUri)
```

Both parties then call `voteOnAIProposal(gigId, true/false)`.

---

### Step 4 — Escalation to Kleros (The Real Part)

If either party rejects the AI verdict, they call:

```solidity
escalateToKleros(gigId)  // must send ETH to cover Kleros fee
```

Inside this function, our contract calls the **Kleros Court contract** directly:

```solidity
uint256 cost = arbitrator.arbitrationCost(arbitratorExtraData);
uint256 disputeId = arbitrator.createDispute{value: cost}(2, arbitratorExtraData);
```

- `arbitrator` = Kleros Court at `0x90992fb4E15ce0C59aEFfb376460Fda4Ee19C879` on Sepolia
- `2` = number of choices (1=PayFreelancer, 2=RefundClient)
- `arbitratorExtraData` = encoded `(subCourtId=0, numberOfJurors=3)` — General Court, 3 jurors

Kleros then:
1. Assigns 3 random jurors who have staked PNK tokens
2. Shows them our MetaEvidence + proof from IPFS on `court.kleros.io`
3. Each juror votes in secret, then reveals
4. Majority wins

Also emitted:

```solidity
emit Dispute(address(arbitrator), disputeId, gig.metaEvidenceID, gig.metaEvidenceID);
```

This is the ERC-1497 signal that tells Kleros: "this dispute belongs to this MetaEvidence context."

---

### Step 5 — Kleros Calls Back (The Magic Part)

After jurors vote, Kleros automatically calls OUR contract:

```solidity
function rule(uint256 _disputeId, uint256 _ruling) external
```

Only Kleros can call this — protected by:

```solidity
require(msg.sender == address(arbitrator), "Only Kleros arbitrator can call rule()");
```

We look up which gig this disputeId belongs to using our reverse mapping:

```solidity
bytes32 gigHash = disputeIdToGigHash[_disputeId];
```

Then we act on the ruling:

```
ruling 1 → _releaseToFreelancer() → 98% to freelancer, 2% platform fee
ruling 2 → _refundClient()        → 100% back to client
ruling 0 → status = DISPUTED_HUMAN (Kleros refused — extremely rare)
```

---

## What We Are Actually Doing vs What Kleros Does

| Who | Does What |
|-----|-----------|
| **Us (GigEscrow.sol)** | Creates the dispute on Kleros, holds the SRT tokens, receives the ruling |
| **Us (Backend)** | Uploads MetaEvidence + proof JSONs to IPFS via Pinata |
| **Us (Frontend)** | Calls `escalateToKleros()` with ETH fee, shows dispute status |
| **Kleros Court Contract** | Assigns jurors, runs the voting, calls `rule()` back on us |
| **Kleros Jurors** | Real humans who read evidence and vote on court.kleros.io |

---

## The Two Interfaces We Implement

### IArbitrable (ERC-792)
Our contract IS the arbitrable. It must implement `rule()` so Kleros can call back:

```solidity
contract GigEscrow is IArbitrable {
    function rule(uint256 _disputeId, uint256 _ruling) external override { ... }
}
```

### IArbitrator (ERC-792)
The Kleros contract IS the arbitrator. We call it:

```solidity
arbitrator.arbitrationCost(extraData)   // how much ETH to pay
arbitrator.createDispute(2, extraData)  // open the case
```

### IEvidence (ERC-1497)
Defines the three events we emit:

```solidity
emit MetaEvidence(id, uri)   // gig context — emitted at gig creation
emit Evidence(arb, id, party, uri)  // proof — emitted when freelancer submits
emit Dispute(arb, disputeId, metaId, evidenceGroupId)  // emitted when Kleros case opens
```

---

## The ETH Fee

Kleros charges ETH (not SRT) for jurors. This is paid by whoever calls `escalateToKleros()`.

On Sepolia testnet the fee is very small (usually 0.001–0.01 ETH).  
On mainnet it would be real ETH (~$5–50 depending on juror count).

The caller needs to:
1. First check the fee: `getArbitrationCost()` on our contract
2. Send at least that much ETH with the transaction

---

## What Is NOT Implemented Yet

| Feature | Status |
|---------|--------|
| `escalateToKleros()` button in frontend | Missing — ResolutionCenter has the function but no UI button wired up |
| `submitEvidenceToKleros()` UI | Missing — no file upload form in ResolutionCenter for Kleros phase |
| Appeal flow | Not implemented — Kleros allows appealing a ruling for higher ETH fee |
| Showing Kleros dispute on court.kleros.io | No link generated yet |

---

## Summary in One Sentence

We wrote a smart contract that holds SRT tokens in escrow, and if a dispute can't be resolved by AI, it opens a real case on the Kleros Court contract (on-chain, no API), where anonymous jurors vote, and Kleros automatically calls back our contract with the verdict which triggers the token release.
