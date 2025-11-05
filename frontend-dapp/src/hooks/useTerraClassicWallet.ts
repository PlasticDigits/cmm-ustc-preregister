import { useState, useEffect, useCallback } from 'react';
import {
  connectTerraWallet,
  disconnectTerraWallet,
  getCurrentTerraAddress,
  isKeplrInstalled,
  isStationInstalled,
} from '@/services/terraclassic/wallet';
import { WalletName, WalletType } from '@goblinhunt/cosmes/wallet';

export type TerraWalletType = 'station' | 'keplr' | null;

export function useTerraClassicWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<TerraWalletType>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStationAvailable, setIsStationAvailable] = useState(false);
  const [isKeplrAvailable, setIsKeplrAvailable] = useState(false);

  const connect = useCallback(
    async (walletName: WalletName = WalletName.STATION, walletType: WalletType = WalletType.EXTENSION) => {
      setIsConnecting(true);
      setError(null);
      try {
        const { address: addr, walletType: type } = await connectTerraWallet(
          walletName,
          walletType
        );
        setAddress(addr);
        setWalletType(type);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
        setError(errorMessage);
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  const disconnect = useCallback(async () => {
    setAddress(null);
    setWalletType(null);
    await disconnectTerraWallet();
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
    getCurrentTerraAddress()
      .then((addr) => {
        if (addr) {
          setAddress(addr);
          // Try to determine wallet type based on availability
          if (isStationInstalled()) {
            setWalletType('station');
          } else if (isKeplrInstalled()) {
            setWalletType('keplr');
          }
        }
      })
      .catch(() => {
        // Ignore errors on auto-connect
      });
  }, []);

  return {
    address,
    walletType,
    isConnected: !!address,
    isConnecting,
    error,
    connect,
    disconnect,
    isStationAvailable,
    isKeplrAvailable,
  };
}
