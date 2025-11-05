import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTerraClassicContract } from '@/services/terraclassic/contract';
import { depositUSTC, withdrawUSTC, setWithdrawalDestination, ownerWithdraw } from '@/services/terraclassic/transactions';
import { formatTokenAmount } from '@/utils/format';

// Terra Classic USTC uses 6 decimals (microUSTC)
const TERRA_USTC_DECIMALS = 6;

/**
 * Hook to interact with Terra Classic contract
 * Similar to useBSCContract but for Terra Classic
 */
export function useTerraClassicContract(userAddress?: string | null) {
  const queryClient = useQueryClient();
  const contract = getTerraClassicContract();

  // Get total deposits
  const totalDeposits = useQuery({
    queryKey: ['terraclassic', 'totalDeposits'],
    queryFn: async () => {
      const total = await contract.getTotalDeposits();
      return formatTokenAmount(total, TERRA_USTC_DECIMALS);
    },
    refetchInterval: 10000,
  });

  // Get user count
  const userCount = useQuery({
    queryKey: ['terraclassic', 'userCount'],
    queryFn: async () => {
      const count = await contract.getUserCount();
      return count;
    },
    refetchInterval: 10000,
  });

  // Get user deposit
  const userDeposit = useQuery({
    queryKey: ['terraclassic', 'userDeposit', userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      const deposit = await contract.getUserDeposit(userAddress);
      return formatTokenAmount(deposit, TERRA_USTC_DECIMALS);
    },
    enabled: !!userAddress,
    refetchInterval: 10000,
  });

  // Check if connected address is owner
  const isOwner = useQuery({
    queryKey: ['terraclassic', 'isOwner', userAddress],
    queryFn: async () => {
      if (!userAddress) return false;
      const config = await contract.getConfig();
      return config.owner.toLowerCase() === userAddress.toLowerCase();
    },
    enabled: !!userAddress,
    refetchInterval: 10000,
  });

  // Deposit mutation
  const deposit = useMutation({
    mutationFn: async (amount: string) => {
      if (!userAddress) throw new Error('Wallet not connected');
      return await depositUSTC(userAddress, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terraclassic'] });
      queryClient.refetchQueries({ queryKey: ['terraclassic'] });
    },
  });

  // Withdraw mutation
  const withdraw = useMutation({
    mutationFn: async (amount: string) => {
      if (!userAddress) throw new Error('Wallet not connected');
      return await withdrawUSTC(userAddress, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terraclassic'] });
      queryClient.refetchQueries({ queryKey: ['terraclassic'] });
    },
  });

  // Owner: Set withdrawal destination mutation
  const setWithdrawalDestinationMutation = useMutation({
    mutationFn: async ({ destination, unlockTimestamp }: { destination: string; unlockTimestamp: number }) => {
      if (!userAddress) throw new Error('Wallet not connected');
      return await setWithdrawalDestination(userAddress, destination, unlockTimestamp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terraclassic'] });
      queryClient.refetchQueries({ queryKey: ['terraclassic'] });
    },
  });

  // Owner: Owner withdraw mutation
  const ownerWithdrawMutation = useMutation({
    mutationFn: async () => {
      if (!userAddress) throw new Error('Wallet not connected');
      return await ownerWithdraw(userAddress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terraclassic'] });
      queryClient.refetchQueries({ queryKey: ['terraclassic'] });
    },
  });

  return {
    contract,
    userDeposit: userDeposit.data || '0',
    totalDeposits: totalDeposits.data || '0',
    userCount: userCount.data || 0,
    isLoading: totalDeposits.isLoading || userCount.isLoading || userDeposit.isLoading,
    deposit: deposit.mutateAsync, // Use mutateAsync so it can be awaited
    withdraw: withdraw.mutateAsync, // Use mutateAsync so it can be awaited
    isDepositing: deposit.isPending,
    isWithdrawing: withdraw.isPending,
    depositError: deposit.error,
    withdrawError: withdraw.error,
    isOwner: isOwner.data || false,
    isLoadingOwner: isOwner.isLoading,
    setWithdrawalDestination: setWithdrawalDestinationMutation.mutateAsync, // Use mutateAsync so it can be awaited
    isSettingWithdrawal: setWithdrawalDestinationMutation.isPending,
    ownerWithdraw: ownerWithdrawMutation.mutateAsync, // Use mutateAsync so it can be awaited
    isOwnerWithdrawing: ownerWithdrawMutation.isPending,
  };
}

