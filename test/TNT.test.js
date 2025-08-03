// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TNT and Factory Contracts", function () {
    let TNT, Factory;
    let factory, tnt, nonRevokableTnt;
    let owner, addr1, addr2;
    let tntAddress, nonRevokableTntAddress;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const FactoryContract = await ethers.getContractFactory("Factory");
        factory = await FactoryContract.deploy();
        await factory.waitForDeployment();

        const TNTContract = await ethers.getContractFactory("TNT");
        TNT = TNTContract;

        // Deploy revokable TNT
        let tx = await factory.createTNT("TestToken", "TTK", true,"https://mydomain.com/image.png");
        let receipt = await tx.wait();
        let event = receipt.logs.find(
            (log) => 'fragment' in log && log.fragment.name === 'TNTCreated'
        );
        tntAddress = event.args[1];
        tnt = await ethers.getContractAt("TNT", tntAddress);

        // Deploy non-revokable TNT
        tx = await factory.createTNT("NonRevokableToken", "NRT", false,"https://mydomain.com/image.png");
        receipt = await tx.wait();
        event = receipt.logs.find(
            (log) => 'fragment' in log && log.fragment.name === 'TNTCreated'
        );
        nonRevokableTntAddress = event.args[1];
        nonRevokableTnt = await ethers.getContractAt("TNT", nonRevokableTntAddress);

        // Issue a token for revocation and burning tests
        await nonRevokableTnt.grantMinterRole(addr1.address);
        await nonRevokableTnt.connect(addr1).issueToken(addr1.address);
    });

    it("should deploy the factory contract", async function () {
        expect(factory.target).to.be.properAddress;
    });

    it("should create a new TNT contract", async function () {
        expect(tntAddress).to.not.be.undefined;
        expect(await tnt.name()).to.equal("TestToken");
        expect(await tnt.symbol()).to.equal("TTK");
        expect(await tnt.revokable()).to.equal(true);
    });

    it("should issue a token and store metadata", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);

        const tokenId = 0;
        expect(await tnt.ownerOf(tokenId)).to.equal(addr2.address);
        expect(await tnt.tokenIssuers(tokenId)).to.equal(addr1.address);
    });

    it("should revoke a token if revokable", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.grantRole(await tnt.REVOKER_ROLE(), addr1.address); // ✅ assign REVOKER_ROLE
        await tnt.connect(addr1).issueToken(addr2.address);
    
        const tokenId = 0;
        await expect(tnt.connect(addr1).revokeToken(tokenId))
            .to.emit(tnt, "Transfer")
            .withArgs(addr2.address, ethers.ZeroAddress, tokenId);
    });
    
    it("should prevent revocation if not revokable", async function () {
        const tokenId = 0;
        await expect(
            nonRevokableTnt.connect(owner).revokeToken(tokenId)
        ).to.be.revertedWithCustomError(nonRevokableTnt, "NotRevokable");
    });
    
    it("should restrict transfers of tokens", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        const tokenId = 0;
    
        await expect(
            tnt.connect(addr2).transferFrom(addr2.address, addr1.address, tokenId)
        ).to.be.revertedWithCustomError(tnt, "NonTransferable");
    });

    it("should allow the admin to grant roles", async function () {
        await tnt.grantMinterRole(addr1.address);
        expect(await tnt.hasRole(await tnt.MINTER_ROLE(), addr1.address)).to.equal(true);

        await tnt.grantRevokerRole(addr2.address);
        expect(await tnt.hasRole(await tnt.REVOKER_ROLE(), addr2.address)).to.equal(true);
    });

    it("should restrict unauthorized role granting", async function () {
        await expect(
            tnt.connect(addr1).grantMinterRole(addr2.address)
        ).to.be.reverted; // If your contract uses a custom error, you may replace this with a specific error
    });

    it("should return deployed TNTs for an owner", async function () {
        const ownerDeployedTNTs = await factory.getDeployedTNTs(owner.address);
        expect(ownerDeployedTNTs).to.include(tntAddress);
        expect(ownerDeployedTNTs).to.include(nonRevokableTntAddress);
    });

    it("should correctly update issued token mapping", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        
        const tokenId = 0;
        const tokenOwner = await tnt.ownerOf(tokenId);
        const tokenIssuer = await tnt.tokenIssuers(tokenId);
    
        expect(tokenOwner).to.equal(addr2.address);
        expect(tokenIssuer).to.equal(addr1.address);
    });
    // Additional tests for TNT contract
    it("should return all issued tokens for a user", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        
        const [tokenIds, issuers] = await tnt.getAllIssuedTokens(addr2.address);
        expect(tokenIds.length).to.equal(1);
        expect(issuers[0]).to.equal(addr1.address);
    });

    it("should return active tokens for a user", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        
        const [tokenIds, issuers] = await tnt.getActiveTokens(addr2.address);
        expect(tokenIds.length).to.equal(1);
        expect(await tnt.hasActiveTokens(addr2.address)).to.equal(true);
        expect(await tnt.getActiveTokenCount(addr2.address)).to.equal(1);
    });

    it("should allow users to burn their own tokens", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        
        const tokenId = 0;
        await tnt.connect(addr2).burnToken(tokenId);
        expect(await tnt.hasActiveTokens(addr2.address)).to.equal(false);
    });

    it("should return all participants count", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        await tnt.connect(addr1).issueToken(addr1.address);
        
        expect(await tnt.getAllParticipantsCount()).to.equal(2);
    });

    it("should return recipients in paginated format", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        await tnt.connect(addr1).issueToken(addr1.address);
        
        const recipients = await tnt.getRecipients(0, 2);
        expect(recipients.length).to.equal(2);
    });

    it("should allow admin to update image URL", async function () {
        const newImageURL = "https://new-image.com/image.png";
        await tnt.setImageURL(newImageURL);
        expect(await tnt.imageURL()).to.equal(newImageURL);
    });

    // Additional tests for Factory contract
    it("should return paginated user TNTs", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        
        const userTNTs = await factory.getPageUserTNTs(addr2.address, 0, 1);
        expect(userTNTs.length).to.equal(1);
    });

    it("should return paginated deployed TNTs", async function () {
        const deployedTNTs = await factory.getPageDeployedTNTs(owner.address, 0, 2);
        expect(deployedTNTs.length).to.equal(2);
    });

    it("should return correct user TNT count", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        
        expect(await factory.getUserTNTCount(addr2.address)).to.equal(1);
    });

    it("should return correct deployed TNT count", async function () {
        expect(await factory.getDeployedTNTCount(owner.address)).to.equal(2);
    });

    it("should register issued tokens and update Factory userTNTs mapping", async function () {
        // addr1 issues token to addr2 via revokable TNT (created by owner)
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
    
        const userTNTs = await factory.getUserTNTs(addr2.address);
        expect(userTNTs).to.include(tntAddress);
    });
    
    it("should unregister tokens from Factory after burning", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        const tokenId = 0;
    
        await tnt.connect(addr2).burnToken(tokenId);
    
        const userTNTs = await factory.getUserTNTs(addr2.address);
        // After burn, the token should be unregistered
        expect(userTNTs).to.not.include(tntAddress);
    });
    
    it("should unregister tokens from Factory after revocation", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.grantRole(await tnt.REVOKER_ROLE(), addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
        const tokenId = 0;
    
        await tnt.connect(addr1).revokeToken(tokenId);
    
        const userTNTs = await factory.getUserTNTs(addr2.address);
        expect(userTNTs).to.not.include(tntAddress);
    });
    
    it("should revert pagination for user TNTs with invalid indices", async function () {
        await expect(factory.getPageUserTNTs(addr1.address, 2, 1)).to.be.revertedWithCustomError(factory, "InvalidIndex");
        await expect(factory.getPageUserTNTs(addr1.address, 10, 11)).to.be.revertedWithCustomError(factory, "InvalidIndex");
    });
    
    it("should revert pagination for deployed TNTs with invalid indices", async function () {
        await expect(factory.getPageDeployedTNTs(owner.address, 5, 3)).to.be.revertedWithCustomError(factory, "InvalidIndex");
        await expect(factory.getPageDeployedTNTs(owner.address, 100, 101)).to.be.revertedWithCustomError(factory, "InvalidIndex");
    });
    
    it("should allow only admin to grant roles and revert on unauthorized attempts", async function () {
        await expect(tnt.connect(addr1).grantMinterRole(addr2.address)).to.be.reverted;
        await expect(tnt.connect(addr1).grantRevokerRole(addr2.address)).to.be.reverted;
    
        await tnt.grantMinterRole(addr1.address);
        expect(await tnt.hasRole(await tnt.MINTER_ROLE(), addr1.address)).to.equal(true);
    });
    
    it("should revert revokeToken if caller is not token issuer", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.grantRole(await tnt.REVOKER_ROLE(), addr1.address); // only addr1 has REVOKER_ROLE
        await tnt.connect(addr1).issueToken(addr2.address);
    
        await tnt.grantRole(await tnt.REVOKER_ROLE(), addr2.address);
    
        await expect(
            tnt.connect(addr2).revokeToken(0)
        ).to.be.revertedWithCustomError(tnt, "NotIssuer");
    });
    
    it("should revert burnToken if caller is not owner", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
    
        // addr1 tries to burn addr2's token
        await expect(
            tnt.connect(addr1).burnToken(0)
        ).to.be.revertedWithCustomError(tnt, "NotOwner");
    });
    
    it("should revert getRecipients with invalid indices", async function () {
        await tnt.grantMinterRole(addr1.address);
        await tnt.connect(addr1).issueToken(addr2.address);
    
        await expect(tnt.getRecipients(1, 0)).to.be.revertedWithCustomError(tnt, "InvalidIndex");
        await expect(tnt.getRecipients(100, 101)).to.be.revertedWithCustomError(tnt, "InvalidIndex");
    });
    
    it("should revert setImageURL when called by non-admin", async function () {
        await expect(
            tnt.connect(addr1).setImageURL("https://malicious.com/image.png")
        ).to.be.reverted;
    });
    
    it("should support standard interfaces", async function () {
        expect(await tnt.supportsInterface("0x80ac58cd")).to.equal(true); // ERC721
        expect(await tnt.supportsInterface("0x7965db0b")).to.equal(true); // AccessControl
    });
    
});
