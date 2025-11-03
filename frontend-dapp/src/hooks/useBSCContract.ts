import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { getContract } from '@/services/bsc/contract';
import { formatTokenAmount, parseTokenAmount } from '@/utils/format';

export function useBSCContract(signer: ethers.JsonRpcSigner | null) {
  const queryClient = useQueryClient();
  const provider = signer ? signer.provider : null;
  
  const contract = signer && provider ? getContract(signer) : null;

  // Get user deposit
  const [userAddress, setUserAddress] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (signer) {
      signer.getAddress().then(setUserAddress).catch(() => setUserAddress(null));
    } else {
      setUserAddress(null);
    }
  }, [signer]);
  
  const userDeposit = useQuery({
    queryKey: ['bsc', 'userDeposit', userAddress],
    queryFn: async () => {
      if (!contract || !userAddress) return null;
      const deposit = await contract.getUserDeposit(userAddress);
      return formatTokenAmount(deposit);
    },
    enabled: !!contract && !!signer,
    refetchInterval: 10000,
  });

  // Get total deposits
  const totalDeposits = useQuery({
    queryKey: ['bsc', 'totalDeposits'],
    queryFn: async () => {
      if (!contract) return null;
      const total = await contract.getTotalDeposits();
      return formatTokenAmount(total);
    },
    enabled: !!contract,
    refetchInterval: 10000,
  });

  // Get user count
  const userCount = useQuery({
    queryKey: ['bsc', 'userCount'],
    queryFn: async () => {
      if (!contract) return null;
      const count = await contract.getUserCount();
      return Number(count);
    },
    enabled: !!contract,
    refetchInterval: 10000,
  });

  // Deposit mutation
  const deposit = useMutation({
    mutationFn: async (amount: string) => {
      if (!contract || !signer) throw new Error('Not connected');
      const amountBN = parseTokenAmount(amount);
      const tx = await contract.deposit(amountBN);
      await tx.wait();
      return tx.hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsc'] });
    },
  });

  // Withdraw mutation
  const withdraw = useMutation({
    mutationFn: async (amount: string) => {
      if (!contract || !signer) throw new Error('Not connected');
      const amountBN = parseTokenAmount(amount);
      const tx = await contract.withdraw(amountBN);
      await tx.wait();
      return tx.hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsc'] });
    },
  });

  return {
    contract,
    userDeposit: userDeposit.data || '0',
    totalDeposits: totalDeposits.data || '0',
    userCount: userCount.data || 0,
    isLoading: userDeposit.isLoading || totalDeposits.isLoading || userCount.isLoading,
    deposit: deposit.mutate,
    withdraw: withdraw.mutate,
    isDepositing: deposit.isPending,
    isWithdrawing: withdraw.isPending,
    depositError: deposit.error,
    withdrawError: withdraw.error,
  };
}

