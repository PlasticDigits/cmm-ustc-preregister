import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Contract, ethers } from 'ethers';
import { getTerraClassicContract } from '@/services/terraclassic/contract';

/**
 * Hook to fetch withdrawal information for timelocked withdrawals
 * @param chain - The blockchain network ('bsc' or 'terraclassic')
 * @param contract - The contract instance (can be null if not connected, or TerraClassicContract for Terra Classic)
 * @returns Withdrawal info including destination, unlock timestamp, time remaining, and unlock status
 */
export function useWithdrawalInfo(
  chain: 'bsc' | 'terraclassic',
  contract: Contract | any | null
) {
  const withdrawalInfo = useQuery({
    queryKey: [chain, 'withdrawalInfo'],
    queryFn: async () => {
      if (chain === 'bsc') {
        if (!contract) return null;
        
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
        // Terra Classic query
        const terraContract = contract || getTerraClassicContract();
        const info = await terraContract.getWithdrawalInfo();
        
        return {
          destination: info.destination || null,
          unlockTimestamp: info.unlock_timestamp || 0,
          isConfigured: info.is_configured || false,
        };
      }
    },
    enabled: chain === 'terraclassic' || !!contract,
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

