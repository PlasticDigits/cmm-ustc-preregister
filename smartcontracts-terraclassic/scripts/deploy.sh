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
    RPC_URL="https://terra-classic-lcd.publicnode.com"
    CHAIN_ID="columbus-5"
elif [ "$NETWORK" = "testnet" ]; then
    RPC_URL="https://terra-classic-testnet-lcd.publicnode.com"
    CHAIN_ID="rebel-2"
else
    echo "Error: Unknown network. Use 'mainnet' or 'testnet'"
    exit 1
fi

echo ""
echo "Step 1: Upload contract code"
echo "Run the following command to upload the contract:"
echo "terrad tx wasm store artifacts/ustc_preregister.wasm --from <your-key> --chain-id $CHAIN_ID --gas auto --gas-adjustment 1.3 --node $RPC_URL --broadcast-mode block -y"
echo ""
echo "Step 2: Instantiate contract"
echo "After uploading, get the code ID from the transaction output, then run:"
echo "terrad tx wasm instantiate <code-id> '{\"owner\":\"$OWNER\",\"ustc_denom\":\"$USTC_DENOM\"}' --from <your-key> --admin $OWNER --chain-id $CHAIN_ID --gas auto --gas-adjustment 1.3 --node $RPC_URL --broadcast-mode block -y --label \"ustc-preregister\""
echo ""
echo "Step 3: Get contract address"
echo "After instantiation, get the contract address from the transaction output:"
echo "terrad query wasm list-contract-by-code <code-id> --node $RPC_URL --output json | jq -r '.[0].contract_address'"
echo ""
echo "Note: Make sure you have terrad installed and configured with your key."

