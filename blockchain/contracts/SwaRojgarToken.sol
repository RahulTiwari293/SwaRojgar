// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SwaRojgarToken
 * @dev ERC20 Token for the SwaRojgar platform
 * 
 * Features:
 * - Standard ERC20 functionality (transfer, approve, transferFrom)
 * - Burnable tokens (users can burn their own tokens)
 * - Mintable by owner (for controlled token distribution)
 * - Initial supply: 1,000,000 SRT tokens
 */
contract SwaRojgarToken is ERC20, ERC20Burnable, Ownable {
    // Token details
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1 million tokens with 18 decimals
    
    /**
     * @dev Constructor that mints initial supply to the deployer
     */
    constructor() ERC20("SwaRojgar Token", "SRT") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Mint new tokens (only owner can call)
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Get token decimals (standard 18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
