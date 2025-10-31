import { ethers } from 'ethers';
import { BSC_CHAIN_ID, BSC_NETWORK_CONFIG } from '@/utils/constants';

export async function connectWallet(): Promise<{ address: string; provider: ethers.BrowserProvider; signer: ethers.JsonRpcSigner }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  
  if (accounts.length === 0) {
    throw new Error('No accounts found');
  }

  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  
  // Check if on correct network
  if (Number(network.chainId) !== BSC_CHAIN_ID) {
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${BSC_CHAIN_ID.toString(16)}` }]);
      // Wait for network switch
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await provider.send('wallet_addEthereumChain', [BSC_NETWORK_CONFIG]);
      } else {
        throw switchError;
      }
    }
  }

  return {
    address: accounts[0],
    provider,
    signer,
  };
}

export async function disconnectWallet(): Promise<void> {
  // MetaMask doesn't have a disconnect method, but we can just clear local state
}

export async function getCurrentAccount(provider: ethers.BrowserProvider): Promise<string | null> {
  try {
    const accounts = await provider.send('eth_accounts', []);
    return accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
}

