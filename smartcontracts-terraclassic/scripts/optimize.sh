#!/bin/bash
set -e

# Build optimized contract using CosmWasm optimizer
# Note: Using a newer version that supports Cargo.lock v4
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/workspace-optimizer:0.16.1

echo "Optimized contract built successfully!"
echo "Output is in artifacts/ directory"

