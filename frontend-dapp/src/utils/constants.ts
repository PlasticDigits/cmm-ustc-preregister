export const BSC_RPC_URL = import.meta.env.VITE_BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
export const BSC_CONTRACT_ADDRESS = import.meta.env.VITE_BSC_CONTRACT_ADDRESS || '';
export const TERRA_RPC_URL = import.meta.env.VITE_TERRA_RPC_URL || 'https://terra-classic-lcd.publicnode.com';
export const TERRA_CONTRACT_ADDRESS = import.meta.env.VITE_TERRA_CONTRACT_ADDRESS || '';
export const USTC_TOKEN_ADDRESS = import.meta.env.VITE_USTC_TOKEN_ADDRESS || '0xA4224f910102490Dc02AAbcBc6cb3c59Ff390055';
export const BSC_CHAIN_ID = parseInt(import.meta.env.VITE_BSC_CHAIN_ID || '56', 10);

export const BSC_NETWORK_CONFIG = {
  chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
  chainName: 'Binance Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: [BSC_RPC_URL],
  blockExplorerUrls: [
    BSC_CHAIN_ID === 56
      ? 'https://bscscan.com'
      : 'https://testnet.bscscan.com',
  ],
};
