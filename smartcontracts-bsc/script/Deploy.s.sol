// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/USTCPreregister.sol";

/**
 * @title DeployScript
 * @notice Deployment script for USTCPreregister contract
 */
contract DeployScript is Script {
    // USTC-cb token address on BSC
    address constant USTC_TOKEN = 0xA4224f910102490Dc02AAbcBc6cb3c59Ff390055;
    
    // Contract owner address
    address constant OWNER = 0x745A676C5c472b50B50e18D4b59e9AeEEc597046;
    
    function run() external {
        vm.startBroadcast();
        
        USTCPreregister contract_ = new USTCPreregister(USTC_TOKEN, OWNER);
        
        console.log("Deployed USTCPreregister at:", address(contract_));
        console.log("USTC Token:", USTC_TOKEN);
        console.log("Owner:", OWNER);
        
        vm.stopBroadcast();
    }
}

