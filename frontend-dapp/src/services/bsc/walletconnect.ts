import { ethers } from 'ethers';
import { UniversalConnector } from '@reown/appkit-universal-connector';
import { getUniversalConnector } from '@/config/walletconnect';
import { BSC_CHAIN_ID } from '@/utils/constants';

let walletConnectProvider: ethers.BrowserProvider | null = null;
let walletConnectSigner: ethers.JsonRpcSigner | null = null;
let currentAddress: string | null = null;

/**
 * Create an EIP-1193 compatible provider wrapper for UniversalConnector
 */
export function createEIP1193Provider(universalConnector: UniversalConnector): ethers.Eip1193Provider {
  return {
    request: async (args: { method: string; params?: unknown[] }) => {
      return await universalConnector.provider.request(args);
    },
    on: (event: string, callback: (...args: unknown[]) => void) => {
      universalConnector.provider.on(event, callback);
    },
    removeListener: (event: string, callback: (...args: unknown[]) => void) => {
      universalConnector.provider.removeListener(event, callback);
    },
  } as ethers.Eip1193Provider;
}

/**
 * Connect wallet using WalletConnect
 */
export async function connectWalletConnect(): Promise<{
  address: string;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
}> {
  try {
    const universalConnector = await getUniversalConnector();
    
    // Connect to WalletConnect
    const { session } = await universalConnector.connect();
    
    if (!session) {
      throw new Error('Failed to establish WalletConnect session');
    }

    // Get accounts from session
    const accounts = session.namespaces.eip155?.accounts || [];
    if (accounts.length === 0) {
      throw new Error('No accounts found in WalletConnect session');
    }

    // Extract address from CAIP-10 format (eip155:chainId:address)
    const account = accounts[0];
    const address = account.split(':')[2];
    
    if (!address) {
      throw new Error('Invalid account format');
    }

    // Create EIP-1193 provider wrapper
    const eip1193Provider = createEIP1193Provider(universalConnector);
    
    // Create ethers BrowserProvider from EIP-1193 provider
    const provider = new ethers.BrowserProvider(eip1193Provider);
    
    // Get signer
    const signer = await provider.getSigner(address);
    
    // Verify network
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== BSC_CHAIN_ID) {
      // Try to switch network
      try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${BSC_CHAIN_ID.toString(16)}` }]);
      } catch (switchError: unknown) {
        // If network doesn't exist, add it
        const error = switchError as { code?: number };
        if (error.code === 4902) {
          await provider.send('wallet_addEthereumChain', [{
            chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
            chainName: 'Binance Smart Chain',
            nativeCurrency: {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18,
            },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com'],
          }]);
        } else {
          throw error;
        }
      }
    }

    // Store references
    walletConnectProvider = provider;
    walletConnectSigner = signer;
    currentAddress = address;

    return {
      address,
      provider,
      signer,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('User rejected') || errorMessage.includes('rejected')) {
      throw new Error('Connection rejected by user');
    }
    throw new Error(`Failed to connect WalletConnect: ${errorMessage}`);
  }
}

/**
 * Disconnect WalletConnect session
 */
export async function disconnectWalletConnect(): Promise<void> {
  try {
    const universalConnector = await getUniversalConnector();
    await universalConnector.disconnect();
  } catch (error) {
    console.error('Error disconnecting WalletConnect:', error);
  } finally {
    walletConnectProvider = null;
    walletConnectSigner = null;
    currentAddress = null;
  }
}

/**
 * Get current WalletConnect account
 */
export async function getCurrentWalletConnectAccount(): Promise<string | null> {
  try {
    const universalConnector = await getUniversalConnector();
    const session = universalConnector.provider.session;
    
    if (!session) {
      return null;
    }

    const accounts = session.namespaces.eip155?.accounts || [];
    if (accounts.length === 0) {
      return null;
    }

    const account = accounts[0];
    return account.split(':')[2] || null;
  } catch {
    return null;
  }
}

/**
 * Check if WalletConnect is connected
 */
export function isWalletConnectConnected(): boolean {
  return currentAddress !== null && walletConnectProvider !== null && walletConnectSigner !== null;
}

