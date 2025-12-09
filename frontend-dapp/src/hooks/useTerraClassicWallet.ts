import { useState, useEffect, useCallback } from 'react';
import {
  connectTerraWallet,
  disconnectTerraWallet,
  getCurrentTerraAddress,
  isKeplrInstalled,
  isStationInstalled,
} from '@/services/terraclassic/wallet';
import { WalletName, WalletType } from '@goblinhunt/cosmes/wallet';

export type TerraWalletType = 'station' | 'keplr' | 'luncdash' | 'galaxy' | 'leap' | 'cosmostation' | null;

export function useTerraClassicWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<TerraWalletType>(null);
  const [connectionType, setConnectionType] = useState<WalletType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingMethod, setConnectingMethod] = useState<{ walletName: WalletName; walletType: WalletType } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStationAvailable, setIsStationAvailable] = useState(false);
  const [isKeplrAvailable, setIsKeplrAvailable] = useState(false);

  const connect = useCallback(
    async (walletName: WalletName = WalletName.STATION, walletTypeParam: WalletType = WalletType.EXTENSION) => {
      setIsConnecting(true);
      setConnectingMethod({ walletName, walletType: walletTypeParam });
      setError(null);
      try {
        // Use cosmes controllers for all wallets
        // LUNC Dash always uses WalletConnect
        const effectiveWalletType = walletName === WalletName.LUNCDASH 
          ? WalletType.WALLETCONNECT 
          : walletTypeParam;
        
        const { address: addr, walletType: type, connectionType: connType } = await connectTerraWallet(
          walletName,
          effectiveWalletType
        );
        setAddress(addr);
        setWalletType(type);
        setConnectionType(connType);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
        setError(errorMessage);
      } finally {
        setIsConnecting(false);
        setConnectingMethod(null);
      }
    },
    []
  );

  const disconnect = useCallback(async () => {
    // Disconnect from all cosmes wallets (Station, LUNC Dash, Keplr, etc.)
    await disconnectTerraWallet();
    
    setAddress(null);
    setWalletType(null);
    setConnectionType(null);
  }, []);

  // Check for wallet availability
  useEffect(() => {
    const checkWallets = () => {
      setIsStationAvailable(isStationInstalled());
      setIsKeplrAvailable(isKeplrInstalled());
    };

    checkWallets();

    // Poll periodically for wallet availability
    const checkInterval = setInterval(checkWallets, 1000); // Check every second

    return () => clearInterval(checkInterval);
  }, []);

  // Auto-connect on mount if wallet is already connected
  useEffect(() => {
    const tryRestore = async () => {
      // Try to restore cosmes wallet connections
      try {
        const addr = await getCurrentTerraAddress();
        if (addr) {
          setAddress(addr);
          // Try to determine wallet type based on availability
          if (isStationInstalled()) {
            setWalletType('station');
            setConnectionType(WalletType.EXTENSION);
          } else if (isKeplrInstalled()) {
            setWalletType('keplr');
            setConnectionType(WalletType.EXTENSION);
          }
        }
      } catch {
        // Ignore errors on auto-connect
      }
    };

    tryRestore();
  }, []);

  // Helper functions to check if specific connection method is loading
  const isConnectingStation = connectingMethod?.walletName === WalletName.STATION && connectingMethod?.walletType === WalletType.EXTENSION;
  const isConnectingKeplr = connectingMethod?.walletName === WalletName.KEPLR && connectingMethod?.walletType === WalletType.EXTENSION;
  const isConnectingWalletConnect = connectingMethod?.walletType === WalletType.WALLETCONNECT || connectingMethod?.walletName === WalletName.LUNCDASH;

  return {
    address,
    walletType,
    connectionType,
    isConnected: !!address,
    isConnecting,
    isConnectingStation,
    isConnectingKeplr,
    isConnectingWalletConnect,
    error,
    connect,
    disconnect,
    isStationAvailable,
    isKeplrAvailable,
  };
}
