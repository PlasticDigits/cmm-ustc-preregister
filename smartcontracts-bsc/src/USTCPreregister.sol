// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUSTCPreregister.sol";

/**
 * @title USTCPreregister
 * @notice Contract for handling USTC-cb deposits, withdrawals, and user enumeration on BSC
 * @dev Users can deposit and withdraw USTC-cb tokens. Owner can withdraw all accumulated tokens.
 */
contract USTCPreregister is IUSTCPreregister, Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    
    /// @notice The USTC-cb token contract address
    IERC20 public immutable ustcToken;
    
    /// @notice Set of all users who have deposited
    EnumerableSet.AddressSet private users;
    
    /// @notice Mapping of user address to their deposit balance
    mapping(address => uint256) public deposits;
    
    /// @notice Total amount of USTC-cb deposited across all users
    uint256 public totalDeposits;
    
    /**
     * @notice Constructor to initialize the contract
     * @param _ustcToken Address of the USTC-cb token contract
     * @param _owner Address of the contract owner
     */
    constructor(address _ustcToken, address _owner) Ownable(_owner) {
        require(_ustcToken != address(0), "USTCPreregister: zero token address");
        // Explicit owner validation (Ownable constructor also validates, but this provides defense-in-depth)
        require(_owner != address(0), "USTCPreregister: zero owner address");
        
        ustcToken = IERC20(_ustcToken);
    }
    
    /**
     * @notice Deposit USTC-cb tokens into the contract
     * @param amount Amount of tokens to deposit
     * @dev User must approve this contract to spend tokens before calling deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "USTCPreregister: amount must be greater than zero");
        
        address user = msg.sender;
        
        // Check user has sufficient balance
        require(
            ustcToken.balanceOf(user) >= amount,
            "USTCPreregister: insufficient balance"
        );
        
        // Check user has approved sufficient allowance
        require(
            ustcToken.allowance(user, address(this)) >= amount,
            "USTCPreregister: insufficient allowance"
        );
        
        // Transfer tokens from user to contract
        ustcToken.safeTransferFrom(user, address(this), amount);
        
        // Update state (Checks-Effects-Interactions pattern)
        bool isNewUser = users.add(user);
        deposits[user] += amount;
        totalDeposits += amount;
        
        // Emit events
        emit Deposit(user, amount);
        if (isNewUser) {
            emit UserAdded(user);
        }
    }
    
    /**
     * @notice Withdraw deposited USTC-cb tokens
     * @param amount Amount of tokens to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "USTCPreregister: amount must be greater than zero");
        
        address user = msg.sender;
        require(deposits[user] >= amount, "USTCPreregister: insufficient deposit balance");
        
        // Update state (Checks-Effects-Interactions pattern)
        deposits[user] -= amount;
        totalDeposits -= amount;
        
        // Transfer tokens from contract to user
        ustcToken.safeTransfer(user, amount);
        
        // Emit event
        emit Withdraw(user, amount);
    }
    
    /**
     * @notice Owner function to withdraw all accumulated USTC-cb tokens
     * @dev Only callable by the contract owner. Once executed after the preregistration period ends, users can no longer withdraw.
     */
    function ownerWithdraw() external onlyOwner nonReentrant {
        uint256 balance = ustcToken.balanceOf(address(this));
        require(balance > 0, "USTCPreregister: no balance to withdraw");
        
        // Transfer all tokens to owner
        ustcToken.safeTransfer(owner(), balance);
        
        // Emit event
        emit OwnerWithdraw(owner(), balance);
    }
    
    /**
     * @notice Get the total number of unique users who have deposited
     * @return Total number of users
     */
    function getUserCount() external view returns (uint256) {
        return users.length();
    }
    
    /**
     * @notice Get user address at a specific index
     * @param index Index in the users set
     * @return User address at the given index
     */
    function getUserAtIndex(uint256 index) external view returns (address) {
        require(index < users.length(), "USTCPreregister: index out of bounds");
        return users.at(index);
    }
    
    /**
     * @notice Get deposit balance for a specific user
     * @param user Address of the user
     * @return Deposit balance of the user
     */
    function getUserDeposit(address user) external view returns (uint256) {
        return deposits[user];
    }
    
    /**
     * @notice Get all user addresses who have deposited
     * @return Array of all user addresses
     * @dev Gas cost increases with number of users
     */
    function getAllUsers() external view returns (address[] memory) {
        uint256 length = users.length();
        address[] memory userList = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            userList[i] = users.at(i);
        }
        
        return userList;
    }
    
    /**
     * @notice Get total amount of USTC-cb deposited across all users
     * @return Total deposits amount
     */
    function getTotalDeposits() external view returns (uint256) {
        return totalDeposits;
    }
}

