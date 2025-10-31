// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUSTCPreregister {
    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event OwnerWithdraw(address indexed owner, uint256 amount);
    event UserAdded(address indexed user);
    
    // Core functions
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function ownerWithdraw() external;
    
    // View functions
    function getUserCount() external view returns (uint256);
    function getUserAtIndex(uint256 index) external view returns (address);
    function getUserDeposit(address user) external view returns (uint256);
    function getAllUsers() external view returns (address[] memory);
    function getTotalDeposits() external view returns (uint256);
    
    // State variables
    function ustcToken() external view returns (IERC20);
    function deposits(address) external view returns (uint256);
    function totalDeposits() external view returns (uint256);
}

