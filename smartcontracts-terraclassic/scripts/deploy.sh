#!/bin/bash
set -e

# Deploy script for Terra Classic
# Usage: ./scripts/deploy.sh <network> <owner_address> <ustc_denom>
# Example: ./scripts/deploy.sh testnet terra1owner uusd

NETWORK=${1:-testnet}
OWNER=${2:-terra1owner}
USTC_DENOM=${3:-uusd}

echo "Deploying USTC Preregister contract to $NETWORK"
echo "Owner: $OWNER"
echo "USTC Denom: $USTC_DENOM"

# Check if optimized contract exists
if [ ! -f "artifacts/ustc_preregister.wasm" ]; then
    echo "Error: Optimized contract not found. Please run ./scripts/optimize.sh first"
    exit 1
fi

# Set RPC endpoint based on network
if [ "$NETWORK" = "mainnet" ]; then
    RPC_URL="https://terra-classic-rpc.publicnode.com:443"
    CHAIN_ID="columbus-5"
elif [ "$NETWORK" = "testnet" ]; then
    RPC_URL="https://terra-classic-rpc.publicnode.com:443"
    CHAIN_ID="rebel-2"
else
    echo "Error: Unknown network. Use 'mainnet' or 'testnet'"
    exit 1
fi

echo ""
echo "Step 1: Upload contract code"
echo "Run the following command to upload the contract:"
echo "terrad tx wasm store artifacts/ustc_preregister.wasm --from <your-key> --chain-id $CHAIN_ID --gas auto --gas-adjustment 1.3 --fees 500000000uluna --node $RPC_URL --broadcast-mode sync -y"
echo ""
echo "After the transaction is confirmed, get the code ID using one of these methods:"
echo "  Method 1 (query by txhash):"
echo "    terrad query tx <txhash> --node $RPC_URL --output json | jq -r '.logs[0].events[] | select(.type==\"store_code\") | .attributes[] | select(.key==\"code_id\") | .value'"
echo "  Method 2 (get latest code ID):"
echo "    terrad query wasm list-code --node $RPC_URL --output json | jq -r '.code_infos[-1].code_id'"
echo ""
echo "Step 2: Instantiate contract"
echo "After getting the code ID, run:"
echo ""
echo "⚠️  IMPORTANT: This contract will be deployed as NON-UPGRADEABLE (immutable)."
echo "The contract cannot be upgraded after deployment. Ensure thorough testing before deployment."
echo ""
echo "terrad tx wasm instantiate <code-id> '{\"owner\":\"$OWNER\"}' --from <your-key> --no-admin --chain-id $CHAIN_ID --gas auto --gas-adjustment 1.3 --fees 500000000uluna --node $RPC_URL --broadcast-mode sync -y --label \"ustc-ustr-swap-preregister\""
echo ""
echo "Note: Using --admin \"\" makes the contract non-upgradeable. If your terrad version supports --no-admin, you can use that instead."
echo ""
echo "Step 3: Get contract address"
echo "After instantiation, get the contract address using one of these methods:"
echo "  Method 1 (list all contracts by code ID - shows all deployments):"
echo "    terrad query wasm list-contract-by-code <code-id> --node $RPC_URL --output json | jq -r '.contracts[]'"
echo "  Method 2 (get latest contract - most recent deployment):"
echo "    terrad query wasm list-contract-by-code <code-id> --node $RPC_URL --output json | jq -r '.contracts[-1]'"
echo "  Method 3 (query by transaction hash):"
echo "    terrad query tx <txhash> --node $RPC_URL --output json | jq -r '.logs[0].events[] | select(.type==\"instantiate\") | .attributes[] | select(.key==\"_contract_address\") | .value'"
echo ""
echo "Note: Make sure you have terrad installed and configured with your key."

