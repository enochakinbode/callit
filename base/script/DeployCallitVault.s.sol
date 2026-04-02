// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {CallitVault} from "../contracts/CallitVault.sol";

contract DeployCallitVault is Script {
    function run() external returns (CallitVault vault) {
        address usdc = vm.envAddress("BASE_SEPOLIA_USDC");
        address treasury = vm.envAddress("CALLIT_TREASURY");
        address approvalOperator = vm.envAddress("CALLIT_APPROVAL_OPERATOR");
        address settlementRelayer = vm.envAddress("CALLIT_SETTLEMENT_RELAYER");
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        vault = new CallitVault(usdc, treasury);
        vault.setApprovalOperator(approvalOperator, true);
        vault.setSettlementRelayer(settlementRelayer, true);

        vm.stopBroadcast();
    }
}
