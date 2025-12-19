// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {ISuperfluid, ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {IGDAv1Forwarder} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/IGDAv1Forwarder.sol";
import {IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title SuperfluidRewardsMacro
 * @notice Macro for batching Superfluid distribution pool operations
 * @dev This macro allows batching:
 *      - Updating member units in a GDA pool
 *      - Creating/updating flow to the pool
 *      All in a single transaction
 */
contract SuperfluidRewardsMacro is ConfirmedOwner {
    ISuperfluid public immutable host;
    IGDAv1Forwarder public immutable gda;
    IConstantFlowAgreementV1 public immutable cfa;
    
    event MacroExecuted(
        address indexed poolAddress,
        address[] receivers,
        uint128[] units,
        int96 flowRate
    );
    
    constructor(
        address _host,
        address _gda,
        address _cfa
    ) ConfirmedOwner(msg.sender) {
        require(_host != address(0), "Invalid host");
        require(_gda != address(0), "Invalid GDA");
        require(_cfa != address(0), "Invalid CFA");
        
        host = ISuperfluid(_host);
        gda = IGDAv1Forwarder(_gda);
        cfa = IConstantFlowAgreementV1(_cfa);
    }
    
    /**
     * @notice Get parameters for macro execution
     * @param poolAddress Distribution pool address
     * @param receivers Array of recipient addresses
     * @param units Array of units for each recipient (must match receivers length)
     * @param flowRate Flow rate in wei per second (can be 0 to skip flow creation)
     * @return params Encoded parameters for macro execution
     */
    function getParams(
        address poolAddress,
        address[] calldata receivers,
        uint128[] calldata units,
        int96 flowRate
    ) external pure returns (bytes memory params) {
        require(receivers.length == units.length, "Arrays length mismatch");
        require(poolAddress != address(0), "Invalid pool address");
        
        params = abi.encode(poolAddress, receivers, units, flowRate);
    }
    
    /**
     * @notice Execute the macro (called by MacroForwarder or directly)
     * @dev This version only updates member units. Use executeWithFlow for flow creation.
     * @param params Encoded parameters from getParams
     */
    function execute(bytes calldata params) external {
        (
            address poolAddress,
            address[] memory receivers,
            uint128[] memory units,
            int96 flowRate
        ) = abi.decode(params, (address, address[], uint128[], int96));
        
        require(receivers.length == units.length, "Arrays length mismatch");
        require(receivers.length > 0, "No receivers");
        
        // Update member units in GDA pool
        gda.updateMemberUnits(poolAddress, receivers, units);
        
        // Note: Flow creation requires super token address
        // Use executeWithFlow method if you need to create flows
        // flowRate parameter is kept for compatibility but not used here
        
        emit MacroExecuted(poolAddress, receivers, units, flowRate);
    }
    
    /**
     * @notice Execute macro with direct flow creation (alternative to using CFA in execute)
     * @param poolAddress Distribution pool address
     * @param receivers Array of recipient addresses
     * @param units Array of units for each recipient
     * @param superToken Super token address
     * @param flowRate Flow rate in wei per second
     */
    function executeWithFlow(
        address poolAddress,
        address[] calldata receivers,
        uint128[] calldata units,
        address superToken,
        int96 flowRate
    ) external {
        require(receivers.length == units.length, "Arrays length mismatch");
        require(receivers.length > 0, "No receivers");
        require(poolAddress != address(0), "Invalid pool address");
        require(superToken != address(0), "Invalid super token");
        
        // Update member units in GDA pool
        gda.updateMemberUnits(poolAddress, receivers, units);
        
        // Create flow if flowRate > 0
        if (flowRate > 0) {
            // Create flow from msg.sender to pool using CFA
            host.callAgreement(
                address(cfa),
                abi.encodeCall(
                    cfa.createFlow,
                    (ISuperToken(superToken), poolAddress, flowRate, new bytes(0))
                ),
                new bytes(0)
            );
        }
        
        emit MacroExecuted(poolAddress, receivers, units, flowRate);
    }
}

