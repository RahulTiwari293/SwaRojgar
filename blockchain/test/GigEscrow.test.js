const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GigEscrow - Complete Workflow", function () {
    let token;
    let escrow;
    let owner;
    let customer;
    let freelancer;
    let admin;

    const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1 million tokens
    const GIG_AMOUNT = ethers.parseEther("100"); // 100 SRT tokens
    const GIG_ID = "gig-12345";
    const IPFS_HASH = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

    beforeEach(async function () {
        // Get signers
        [owner, customer, freelancer, admin] = await ethers.getSigners();

        // Deploy token
        const SwaRojgarToken = await ethers.getContractFactory("SwaRojgarToken");
        token = await SwaRojgarToken.deploy();
        await token.waitForDeployment();

        // Deploy escrow
        const GigEscrow = await ethers.getContractFactory("GigEscrow");
        escrow = await GigEscrow.deploy(await token.getAddress());
        await escrow.waitForDeployment();

        // Transfer tokens to customer for testing
        await token.transfer(customer.address, ethers.parseEther("10000"));
    });

    describe("Token Deployment", function () {
        it("Should have correct name and symbol", async function () {
            expect(await token.name()).to.equal("SwaRojgar Token");
            expect(await token.symbol()).to.equal("SRT");
        });

        it("Should mint initial supply to owner", async function () {
            const ownerBalance = await token.balanceOf(owner.address);
            expect(ownerBalance).to.be.gt(0);
        });
    });

    describe("Gig Creation", function () {
        it("Should create gig and lock tokens in escrow", async function () {
            // Approve escrow to spend tokens
            await token.connect(customer).approve(await escrow.getAddress(), GIG_AMOUNT);

            // Create gig
            await expect(
                escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0)
            ).to.emit(escrow, "GigCreated")
                .withArgs(GIG_ID, customer.address, GIG_AMOUNT, 0);

            // Check gig details
            const gig = await escrow.getGig(GIG_ID);
            expect(gig.customer).to.equal(customer.address);
            expect(gig.amount).to.equal(GIG_AMOUNT);
            expect(gig.status).to.equal(0); // OPEN

            // Check escrow balance
            const escrowBalance = await token.balanceOf(await escrow.getAddress());
            expect(escrowBalance).to.equal(GIG_AMOUNT);
        });

        it("Should fail if amount is zero", async function () {
            await expect(
                escrow.connect(customer).createGig(GIG_ID, 0, 0)
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("Should fail if gig already exists", async function () {
            await token.connect(customer).approve(await escrow.getAddress(), GIG_AMOUNT * 2n);
            await escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0);

            await expect(
                escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0)
            ).to.be.revertedWith("Gig already exists");
        });
    });

    describe("Gig Acceptance", function () {
        beforeEach(async function () {
            await token.connect(customer).approve(await escrow.getAddress(), GIG_AMOUNT);
            await escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0);
        });

        it("Should allow freelancer to accept gig", async function () {
            await expect(
                escrow.connect(freelancer).acceptGig(GIG_ID)
            ).to.emit(escrow, "GigAccepted")
                .withArgs(GIG_ID, freelancer.address);

            const gig = await escrow.getGig(GIG_ID);
            expect(gig.freelancer).to.equal(freelancer.address);
            expect(gig.status).to.equal(1); // ASSIGNED
        });

        it("Should fail if customer tries to accept own gig", async function () {
            await expect(
                escrow.connect(customer).acceptGig(GIG_ID)
            ).to.be.revertedWith("Customer cannot accept own gig");
        });
    });

    describe("Proof Submission", function () {
        beforeEach(async function () {
            await token.connect(customer).approve(await escrow.getAddress(), GIG_AMOUNT);
            await escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0);
            await escrow.connect(freelancer).acceptGig(GIG_ID);
        });

        it("Should allow freelancer to submit proof", async function () {
            await expect(
                escrow.connect(freelancer).submitProof(GIG_ID, IPFS_HASH)
            ).to.emit(escrow, "ProofSubmitted")
                .withArgs(GIG_ID, IPFS_HASH);

            const gig = await escrow.getGig(GIG_ID);
            expect(gig.ipfsHash).to.equal(IPFS_HASH);
            expect(gig.status).to.equal(2); // PROOF_SUBMITTED
        });

        it("Should fail if non-freelancer tries to submit proof", async function () {
            await expect(
                escrow.connect(customer).submitProof(GIG_ID, IPFS_HASH)
            ).to.be.revertedWith("Only assigned freelancer can submit proof");
        });
    });

    describe("Work Approval and Payment", function () {
        beforeEach(async function () {
            await token.connect(customer).approve(await escrow.getAddress(), GIG_AMOUNT);
            await escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0);
            await escrow.connect(freelancer).acceptGig(GIG_ID);
            await escrow.connect(freelancer).submitProof(GIG_ID, IPFS_HASH);
        });

        it("Should release payment when customer approves", async function () {
            const freelancerBalanceBefore = await token.balanceOf(freelancer.address);

            await expect(
                escrow.connect(customer).approveWork(GIG_ID)
            ).to.emit(escrow, "WorkApproved")
                .withArgs(GIG_ID);

            const gig = await escrow.getGig(GIG_ID);
            expect(gig.status).to.equal(3); // COMPLETED

            // Check freelancer received payment (minus 2% platform fee)
            const freelancerBalanceAfter = await token.balanceOf(freelancer.address);
            const expectedAmount = GIG_AMOUNT * 98n / 100n; // 98% of amount
            expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedAmount);
        });

        it("Should collect platform fee", async function () {
            const feeCollector = await escrow.feeCollector();
            const feeCollectorBalanceBefore = await token.balanceOf(feeCollector);

            await escrow.connect(customer).approveWork(GIG_ID);

            const feeCollectorBalanceAfter = await token.balanceOf(feeCollector);
            const expectedFee = GIG_AMOUNT * 2n / 100n; // 2% platform fee
            expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
        });
    });

    describe("Work Rejection and Dispute", function () {
        beforeEach(async function () {
            await token.connect(customer).approve(await escrow.getAddress(), GIG_AMOUNT);
            await escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0);
            await escrow.connect(freelancer).acceptGig(GIG_ID);
            await escrow.connect(freelancer).submitProof(GIG_ID, IPFS_HASH);
        });

        it("Should allow customer to reject work", async function () {
            const reason = "Work does not meet requirements";

            await expect(
                escrow.connect(customer).rejectWork(GIG_ID, reason)
            ).to.emit(escrow, "WorkRejected")
                .withArgs(GIG_ID, reason);

            const gig = await escrow.getGig(GIG_ID);
            expect(gig.status).to.equal(4); // DISPUTED
        });

        it("Should allow admin to resolve dispute in favor of freelancer", async function () {
            await escrow.connect(customer).rejectWork(GIG_ID, "Dispute");

            const freelancerBalanceBefore = await token.balanceOf(freelancer.address);

            await expect(
                escrow.connect(owner).resolveDispute(GIG_ID, true)
            ).to.emit(escrow, "DisputeResolved")
                .withArgs(GIG_ID, true);

            const freelancerBalanceAfter = await token.balanceOf(freelancer.address);
            expect(freelancerBalanceAfter).to.be.gt(freelancerBalanceBefore);
        });

        it("Should allow admin to resolve dispute in favor of customer", async function () {
            await escrow.connect(customer).rejectWork(GIG_ID, "Dispute");

            const customerBalanceBefore = await token.balanceOf(customer.address);

            await escrow.connect(owner).resolveDispute(GIG_ID, false);

            const customerBalanceAfter = await token.balanceOf(customer.address);
            expect(customerBalanceAfter - customerBalanceBefore).to.equal(GIG_AMOUNT);
        });
    });

    describe("Gig Cancellation", function () {
        it("Should allow customer to cancel open gig", async function () {
            await token.connect(customer).approve(await escrow.getAddress(), GIG_AMOUNT);
            await escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0);

            const customerBalanceBefore = await token.balanceOf(customer.address);

            await expect(
                escrow.connect(customer).cancelGig(GIG_ID)
            ).to.emit(escrow, "GigCancelled")
                .withArgs(GIG_ID);

            const customerBalanceAfter = await token.balanceOf(customer.address);
            expect(customerBalanceAfter - customerBalanceBefore).to.equal(GIG_AMOUNT);
        });

        it("Should fail to cancel assigned gig", async function () {
            await token.connect(customer).approve(await escrow.getAddress(), GIG_AMOUNT);
            await escrow.connect(customer).createGig(GIG_ID, GIG_AMOUNT, 0);
            await escrow.connect(freelancer).acceptGig(GIG_ID);

            await expect(
                escrow.connect(customer).cancelGig(GIG_ID)
            ).to.be.revertedWith("Can only cancel open gigs");
        });
    });
});
