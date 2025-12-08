import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  connectWalletConnect,
  disconnectWalletConnect,
  createEIP1193Provider,
} from '@/services/bsc/walletconnect';
import { getUniversalConnector } from '@/config/walletconnect';
import { BSC_CHAIN_ID } from '@/utils/constants';

export function useBSCWalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { address: addr, provider: prov, signer: sig } = await connectWalletConnect();
      setAddress(addr);
      setProvider(prov);
      setSigner(sig);
      const network = await prov.getNetwork();
      setChainId(Number(network.chainId));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect WalletConnect';
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    await disconnectWalletConnect();
  }, []);

  // Auto-connect on mount if session exists
  useEffect(() => {
    const checkSession = async () => {
      try {
        const universalConnector = await getUniversalConnector();
        const session = universalConnector.provider.session;
        
        if (session) {
          const accounts = session.namespaces.eip155?.accounts || [];
          if (accounts.length > 0) {
            // Extract address from CAIP-10 format
            const account = accounts[0];
            const addr = account.split(':')[2];
            
            if (addr) {
              // Create provider from existing session
              const eip1193Provider = createEIP1193Provider(universalConnector);
              
              const prov = new ethers.BrowserProvider(eip1193Provider);
              const sig = await prov.getSigner(addr);
              const network = await prov.getNetwork();
              
              setAddress(addr);
              setProvider(prov);
              setSigner(sig);
              setChainId(Number(network.chainId));
            }
          }
        }
      } catch {
        // Ignore errors on auto-connect
      }
    };

    checkSession();

    // Listen for session changes
    let universalConnector: Awaited<ReturnType<typeof getUniversalConnector>> | null = null;
    let cleanupFn: (() => void) | null = null;

    const setupListeners = async () => {
      try {
        universalConnector = await getUniversalConnector();
        
        // Define handler functions
        const handleSessionDelete = () => {
          disconnectWallet();
        };

        const handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length > 0) {
            const account = accounts[0];
            // Extract address from CAIP-10 format if needed
            const addr = account.includes(':') ? account.split(':')[2] : account;
            setAddress(addr);
          } else {
            disconnectWallet();
          }
        };

        const handleChainChanged = () => {
          window.location.reload();
        };
        
        // Listen for session disconnect
        universalConnector.provider.on('session_delete', handleSessionDelete);

        // Listen for account changes
        universalConnector.provider.on('accountsChanged', handleAccountsChanged);

        // Listen for chain changes
        universalConnector.provider.on('chainChanged', handleChainChanged);

        // Store cleanup function
        cleanupFn = () => {
          if (universalConnector) {
            universalConnector.provider.removeListener('session_delete', handleSessionDelete);
            universalConnector.provider.removeListener('accountsChanged', handleAccountsChanged);
            universalConnector.provider.removeListener('chainChanged', handleChainChanged);
          }
        };
      } catch {
        // Ignore errors
        cleanupFn = () => {}; // Empty cleanup function
      }
    };

    setupListeners();

    // Return cleanup function
    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [disconnectWallet]);

  const isCorrectNetwork = chainId === BSC_CHAIN_ID;

  return {
    address,
    provider,
    signer,
    chainId,
    isConnected: !!address && !!signer,
    isCorrectNetwork,
    isConnecting,
    error,
    connect,
    disconnect: disconnectWallet,
  };
}

