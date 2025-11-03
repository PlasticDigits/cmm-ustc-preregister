import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Contract, ethers } from 'ethers';

/**
 * Hook to fetch withdrawal information for timelocked withdrawals
 * @param chain - The blockchain network ('bsc' or 'terraclassic')
 * @param contract - The contract instance (can be null if not connected)
 * @returns Withdrawal info including destination, unlock timestamp, time remaining, and unlock status
 */
export function useWithdrawalInfo(
  chain: 'bsc' | 'terraclassic',
  contract: Contract | null
) {
  const withdrawalInfo = useQuery({
    queryKey: [chain, 'withdrawalInfo'],
    queryFn: async () => {
      if (!contract) return null;
      
      if (chain === 'bsc') {
        const [destination, timestamp, isConfigured] = await Promise.all([
          contract.getWithdrawalDestination(),
          contract.getWithdrawalUnlockTimestamp(),
          contract.isWithdrawalConfigured(),
        ]);
        
        return {
          destination: destination === ethers.ZeroAddress ? null : destination,
          unlockTimestamp: Number(timestamp),
          isConfigured,
        };
      } else {
        // Terra Classic query - placeholder for now
        // TODO: Implement when Terra Classic service is available
        return {
          destination: null,
          unlockTimestamp: 0,
          isConfigured: false,
        };
      }
    },
    enabled: !!contract,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  const timeRemaining = useMemo(() => {
    if (!withdrawalInfo.data?.isConfigured) return null;
    const now = Math.floor(Date.now() / 1000);
    const remaining = withdrawalInfo.data.unlockTimestamp - now;
    return remaining > 0 ? remaining : 0;
  }, [withdrawalInfo.data]);
  
  const isUnlocked = useMemo(() => {
    return timeRemaining !== null && timeRemaining === 0;
  }, [timeRemaining]);
  
  return {
    withdrawalInfo: withdrawalInfo.data,
    isLoading: withdrawalInfo.isLoading,
    timeRemaining,
    isUnlocked,
  };
}

