// Terra Classic wallet integration using cosmes
import {
  ConnectedWallet,
  KeplrController,
  StationController,
  WalletController,
  WalletName,
  WalletType,
} from '@goblinhunt/cosmes/wallet';
import { TERRA_RPC_URL } from '@/utils/constants';

const TERRA_CLASSIC_CHAIN_ID = 'columbus-5';
const WC_PROJECT_ID = '2b7d5a2da89dd74fed821d184acabf95'; // Public WalletConnect project ID

// Gas price for Terra Classic (28.325 uluna per gas unit)
const GAS_PRICE = {
  amount: '28.325',
  denom: 'uluna',
};

// Create wallet controllers
const STATION_CONTROLLER = new StationController();
const KEPLR_CONTROLLER = new KeplrController(WC_PROJECT_ID);

const CONTROLLERS: Partial<Record<WalletName, WalletController>> = {
  [WalletName.STATION]: STATION_CONTROLLER,
  [WalletName.KEPLR]: KEPLR_CONTROLLER,
};

// Store connected wallets
const connectedWallets: Map<string, ConnectedWallet> = new Map();

/**
 * Get chain info for Terra Classic
 */
function getChainInfo() {
  return {
    chainId: TERRA_CLASSIC_CHAIN_ID,
    rpc: TERRA_RPC_URL,
    gasPrice: GAS_PRICE,
  };
}

/**
 * Check if Station wallet is installed
 */
export function isStationInstalled(): boolean {
  return typeof window !== 'undefined' && 'station' in window;
}

/**
 * Check if Keplr wallet is installed
 */
export function isKeplrInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.keplr;
}

/**
 * Connect to Terra Classic wallet using cosmes
 * @param walletName - The wallet to connect (station or keplr)
 * @param walletType - Extension or WalletConnect
 * @returns Connected wallet address and type
 */
export async function connectTerraWallet(
  walletName: WalletName = WalletName.STATION,
  walletType: WalletType = WalletType.EXTENSION
): Promise<{ address: string; walletType: 'station' | 'keplr' }> {
  const controller = CONTROLLERS[walletName];
  if (!controller) {
    throw new Error(`Unsupported wallet: ${walletName}`);
  }

  try {
    const chainInfo = getChainInfo();
    const wallets = await controller.connect(walletType, [chainInfo]);
    
    if (wallets.size === 0) {
      throw new Error('No wallets connected');
    }

    // Get the wallet for Terra Classic chain
    const wallet = wallets.get(TERRA_CLASSIC_CHAIN_ID);
    if (!wallet) {
      throw new Error(`Failed to connect to Terra Classic chain (${TERRA_CLASSIC_CHAIN_ID})`);
    }

    connectedWallets.set(TERRA_CLASSIC_CHAIN_ID, wallet);

    return {
      address: wallet.address,
      walletType: walletName === WalletName.STATION ? 'station' : 'keplr',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide specific error messages for Keplr
    if (walletName === WalletName.KEPLR) {
      if (errorMessage.includes('not installed') || errorMessage.includes('Keplr')) {
        throw new Error('Keplr wallet is not installed. Please install the Keplr extension.');
      }
      if (errorMessage.includes('chain') && errorMessage.includes('not found')) {
        throw new Error('Terra Classic chain not found in Keplr. Please add it manually or refresh the page.');
      }
    }
    
    // Provide specific error messages for Station
    if (walletName === WalletName.STATION) {
      if (errorMessage.includes('not installed') || errorMessage.includes('Station')) {
        throw new Error('Station wallet is not installed. Please install the Station extension.');
      }
    }
    
    if (errorMessage.includes('User rejected') || errorMessage.includes('rejected')) {
      throw new Error('Connection rejected by user');
    }
    
    throw new Error(`Failed to connect ${walletName === WalletName.STATION ? 'Station' : 'Keplr'} wallet: ${errorMessage}`);
  }
}

/**
 * Disconnect wallet
 */
export async function disconnectTerraWallet(): Promise<void> {
  const wallet = connectedWallets.get(TERRA_CLASSIC_CHAIN_ID);
  if (wallet) {
    const controller = CONTROLLERS[wallet.id];
    if (controller) {
      controller.disconnect([TERRA_CLASSIC_CHAIN_ID]);
    }
    connectedWallets.delete(TERRA_CLASSIC_CHAIN_ID);
  }
}

/**
 * Get current connected wallet
 */
export function getConnectedWallet(): ConnectedWallet | null {
  return connectedWallets.get(TERRA_CLASSIC_CHAIN_ID) || null;
}

/**
 * Get current connected address
 */
export async function getCurrentTerraAddress(): Promise<string | null> {
  const wallet = connectedWallets.get(TERRA_CLASSIC_CHAIN_ID);
  if (wallet) {
    return wallet.address;
  }

  // Try to auto-connect if wallets are available
  try {
    if (isStationInstalled()) {
      const result = await connectTerraWallet(WalletName.STATION, WalletType.EXTENSION);
      return result.address;
    } else if (isKeplrInstalled()) {
      const result = await connectTerraWallet(WalletName.KEPLR, WalletType.EXTENSION);
      return result.address;
    }
  } catch {
    // Ignore errors on auto-connect
  }

  return null;
}

/**
 * Check if wallet is connected
 */
export async function isTerraWalletConnected(): Promise<boolean> {
  const address = await getCurrentTerraAddress();
  return address !== null;
}

// Extend window types for wallet detection
declare global {
  interface Window {
    station?: {
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
    };
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getOfflineSigner: (chainId: string) => unknown;
    };
  }
}
