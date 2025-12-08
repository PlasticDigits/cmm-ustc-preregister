import { useState, useEffect, useCallback } from 'react';
import {
  connectTerraWallet,
  disconnectTerraWallet,
  getCurrentTerraAddress,
  isKeplrInstalled,
  isStationInstalled,
} from '@/services/terraclassic/wallet';
import {
  connectLuncDash,
  disconnectLuncDash,
  restoreLuncDashSession,
  isLuncDashConnected,
} from '@/services/terraclassic/luncdash-walletconnect';
import {
  connectTerraStation,
  disconnectTerraStation,
  restoreTerraStationSession,
  isTerraStationConnected,
} from '@/services/terraclassic/terrastation-walletconnect';
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
        // Use custom LuncDash implementation for WalletConnect (avoids pub key requirement)
        if (walletName === WalletName.LUNCDASH) {
          const { address: addr } = await connectLuncDash();
          setAddress(addr);
          setWalletType('luncdash');
          setConnectionType(WalletType.WALLETCONNECT);
        } else if (walletName === WalletName.STATION && walletTypeParam === WalletType.WALLETCONNECT) {
          // Use custom TerraStation WalletConnect implementation
          const { address: addr } = await connectTerraStation();
          setAddress(addr);
          setWalletType('station');
          setConnectionType(WalletType.WALLETCONNECT);
        } else {
          const { address: addr, walletType: type, connectionType: connType } = await connectTerraWallet(
            walletName,
            walletTypeParam
          );
          setAddress(addr);
          setWalletType(type);
          setConnectionType(connType);
        }
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
    // Disconnect from LuncDash if connected via WalletConnect
    if (walletType === 'luncdash' || isLuncDashConnected()) {
      await disconnectLuncDash();
    }
    // Disconnect from TerraStation if connected via WalletConnect
    if (isTerraStationConnected()) {
      await disconnectTerraStation();
    }
    // Also disconnect from cosmes wallets
    await disconnectTerraWallet();
    
    setAddress(null);
    setWalletType(null);
    setConnectionType(null);
  }, [walletType]);

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
      // First try to restore LuncDash session
      try {
        const luncDashSession = await restoreLuncDashSession();
        if (luncDashSession) {
          setAddress(luncDashSession.address);
          setWalletType('luncdash');
          setConnectionType(WalletType.WALLETCONNECT);
          return; // Session restored, no need to check other wallets
        }
      } catch {
        // Ignore errors on LuncDash restore
      }

      // Try to restore TerraStation session
      try {
        const terraStationSession = await restoreTerraStationSession();
        if (terraStationSession) {
          setAddress(terraStationSession.address);
          setWalletType('station');
          setConnectionType(WalletType.WALLETCONNECT);
          return; // Session restored, no need to check other wallets
        }
      } catch {
        // Ignore errors on TerraStation restore
      }

      // Then try cosmes wallets
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
