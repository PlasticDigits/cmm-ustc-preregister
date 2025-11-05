export const BSC_RPC_URL = import.meta.env.VITE_BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
export const BSC_CONTRACT_ADDRESS = import.meta.env.VITE_BSC_CONTRACT_ADDRESS || '0xe50DaD8c95dd7A43D792a040146EFaA4801d62B8';
// LCD endpoint for REST API queries
export const TERRA_LCD_URL = import.meta.env.VITE_TERRA_LCD_URL || 'https://terra-classic-lcd.publicnode.com';
// RPC endpoint for JSON-RPC (broadcast_tx_sync)
export const TERRA_RPC_URL = import.meta.env.VITE_TERRA_RPC_URL || 'https://terra-classic-rpc.publicnode.com';
export const TERRA_CONTRACT_ADDRESS = import.meta.env.VITE_TERRA_CONTRACT_ADDRESS || 'terra1j4y03s9tly2qfu5hv5pfga9yls0ygjnl97cznvedw3ervh3t7ntqfl7q9z';
export const TERRA_CONTRACT_CODE_ID = import.meta.env.VITE_TERRA_CONTRACT_CODE_ID || '10508';
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

export const TERRA_CONTRACT_CONFIG = {
  address: TERRA_CONTRACT_ADDRESS,
  codeId: TERRA_CONTRACT_CODE_ID,
  rpcUrl: TERRA_RPC_URL,
  lcdUrl: TERRA_LCD_URL,
};
