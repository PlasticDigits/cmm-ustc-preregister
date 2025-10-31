import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { connectWallet, disconnectWallet as disconnect, getCurrentAccount } from '@/services/bsc/wallet';
import { getBrowserProvider } from '@/services/bsc/provider';
import { BSC_CHAIN_ID } from '@/utils/constants';

export function useBSCWallet() {
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
      const { address: addr, provider: prov, signer: sig } = await connectWallet();
      setAddress(addr);
      setProvider(prov);
      setSigner(sig);
      const network = await prov.getNetwork();
      setChainId(Number(network.chainId));
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    await disconnect();
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    const browserProvider = getBrowserProvider();
    if (browserProvider) {
      getCurrentAccount(browserProvider)
        .then(account => {
          if (account) {
            setAddress(account);
            setProvider(browserProvider);
            browserProvider.getSigner().then(setSigner);
            browserProvider.getNetwork().then(network => setChainId(Number(network.chainId)));
          }
        })
        .catch(() => {
          // Ignore errors on auto-connect
        });

      // Listen for account changes
      window.ethereum?.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      // Listen for chain changes
      window.ethereum?.on('chainChanged', () => {
        window.location.reload();
      });
    }
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

