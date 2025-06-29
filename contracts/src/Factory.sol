// SPDX-License-Identifier: AEL
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TNT.sol";

/**
 * @title Factory
 * @dev A factory contract to deploy and manage instances of the TNT contract.
 */
contract Factory {
    mapping(address => address[]) public deployedTNTs;
    mapping(address => address[]) public userTNTs; // Track TNT contracts for each user

    /// @dev Event emitted when a new TNT contract is created.
    event TNTCreated(address indexed owner, address tntAddress);
    event TokenRegistered(address indexed user, address indexed tntAddress);

    /**
     * @dev Creates a new TNT contract.
     * @param name The name of the TNT token.
     * @param symbol The symbol of the TNT token.
     * @param revokable Whether the token is revokable or not.
     * @param imageURL contains the image of the token
     * @return The address of the newly deployed TNT contract.
     */
    function createTNT(string memory name, string memory symbol, bool revokable, string memory imageURL)
    public
    returns (address)
    {
        TNT newTNT = new TNT(msg.sender, name, symbol, revokable, address(this), imageURL);
        address tntAddress = address(newTNT);
        deployedTNTs[msg.sender].push(tntAddress);
        emit TNTCreated(msg.sender, tntAddress);
        return tntAddress;
    }
    
    /**
     * @dev Registers an issued token in the factory contract.
     * This function is called by TNT contracts when issuing tokens.
     * @param user The address of the user receiving the token.
     * @param tntAddress The address of the TNT contract issuing the token.
     */
    function registerIssuedToken(address user, address tntAddress) external {
        userTNTs[user].push(tntAddress);
        emit TokenRegistered(user, tntAddress);
    }

    /**
     * @dev Returns all TNT contracts deployed by a specific owner.
     * @param owner The address of the owner.
     * @return An array of TNT contract addresses deployed by the owner.
     */
    function getDeployedTNTs(address owner) public view returns (address[] memory) {
        return deployedTNTs[owner];
    }

    /**
     * @dev Returns all TNT contracts from which a user has received tokens.
     * @param user The address of the user.
     * @return An array of TNT contract addresses where the user has received tokens.
     */
    function getUserTNTs(address user) public view returns (address[] memory) {
        return userTNTs[user];
    }

    function _getSubArray(address[] memory tokens, uint256 start, uint256 end) internal pure returns (address[] memory) {
        require(start <= end, "Start index must be less than or equal to end index");
        require(start <= tokens.length, "Start index out of bounds");

        if (end >= tokens.length) {
            end = tokens.length;
        }

        uint256 resultLength = end - start;
        address[] memory result = new address[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = tokens[start + i];
        }        
        return result;
    }

    function getPageUserTNTs(address user, uint256 start, uint256 end) external view returns (address[] memory) {
        return _getSubArray(getUserTNTs(user), start, end);
    }
    function getPageDeployedTNTs(address owner, uint256 start, uint256 end) external view returns (address[] memory) {
        return _getSubArray(getDeployedTNTs(owner), start, end);
    }

    function getUserTNTCount(address user) external view returns (uint256) { return userTNTs[user].length; }
    function getDeployedTNTCount(address owner) external view returns (uint256) { return deployedTNTs[owner].length; }

}
