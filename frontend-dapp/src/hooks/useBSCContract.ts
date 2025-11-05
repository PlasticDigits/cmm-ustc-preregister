import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { getContract } from '@/services/bsc/contract';
import { getProvider } from '@/services/bsc/provider';
import { formatTokenAmount, parseTokenAmount } from '@/utils/format';

export function useBSCContract(signer: ethers.JsonRpcSigner | null) {
  const queryClient = useQueryClient();
  const provider = signer ? signer.provider : getProvider();
  
  // Create contract with signer if available, otherwise use read-only provider
  const contract = provider ? getContract(signer || provider) : null;

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

  // Get raw user deposit for precision (bigint)
  const userDepositRaw = useQuery({
    queryKey: ['bsc', 'userDepositRaw', userAddress],
    queryFn: async () => {
      if (!contract || !userAddress) return null;
      const deposit = await contract.getUserDeposit(userAddress);
      return deposit;
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

  // Check if connected address is owner
  const isOwner = useQuery({
    queryKey: ['bsc', 'isOwner', userAddress],
    queryFn: async () => {
      if (!contract || !userAddress) return false;
      const owner = await contract.owner();
      return owner.toLowerCase() === userAddress.toLowerCase();
    },
    enabled: !!contract && !!userAddress,
    refetchInterval: 10000,
  });

  // Deposit mutation
  const deposit = useMutation({
    mutationFn: async (amount: string) => {
      if (!contract || !signer) throw new Error('Not connected');
      const amountBN = parseTokenAmount(amount);
      const tx = await contract.deposit(amountBN);
      await tx.wait();
      // Wait a bit for blockchain state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      return tx.hash;
    },
    onSuccess: () => {
      // Invalidate and refetch all BSC queries
      queryClient.invalidateQueries({ queryKey: ['bsc'] });
      queryClient.refetchQueries({ queryKey: ['bsc'] });
    },
  });

  // Withdraw mutation
  const withdraw = useMutation({
    mutationFn: async (amount: string) => {
      if (!contract || !signer) throw new Error('Not connected');
      const amountBN = parseTokenAmount(amount);
      const tx = await contract.withdraw(amountBN);
      await tx.wait();
      // Wait a bit for blockchain state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      return tx.hash;
    },
    onSuccess: () => {
      // Invalidate and refetch all BSC queries
      queryClient.invalidateQueries({ queryKey: ['bsc'] });
      queryClient.refetchQueries({ queryKey: ['bsc'] });
    },
  });

  // Owner: Set withdrawal destination mutation
  const setWithdrawalDestination = useMutation({
    mutationFn: async ({ destination, unlockTimestamp }: { destination: string; unlockTimestamp: number }) => {
      if (!contract || !signer) throw new Error('Not connected');
      const tx = await contract.setWithdrawalDestination(destination, unlockTimestamp);
      await tx.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));
      return tx.hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsc'] });
      queryClient.refetchQueries({ queryKey: ['bsc'] });
    },
  });

  // Owner: Owner withdraw mutation
  const ownerWithdraw = useMutation({
    mutationFn: async () => {
      if (!contract || !signer) throw new Error('Not connected');
      const tx = await contract.ownerWithdraw();
      await tx.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));
      return tx.hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsc'] });
      queryClient.refetchQueries({ queryKey: ['bsc'] });
    },
  });

  return {
    contract,
    userDeposit: userDeposit.data || '0',
    userDepositRaw: userDepositRaw.data || 0n, // Raw deposit for precision
    totalDeposits: totalDeposits.data || '0',
    userCount: userCount.data || 0,
    isLoading: userDeposit.isLoading || totalDeposits.isLoading || userCount.isLoading,
    deposit: deposit.mutateAsync,
    withdraw: withdraw.mutateAsync,
    isDepositing: deposit.isPending,
    isWithdrawing: withdraw.isPending,
    depositError: deposit.error,
    withdrawError: withdraw.error,
    isOwner: isOwner.data || false,
    isLoadingOwner: isOwner.isLoading,
    setWithdrawalDestination: setWithdrawalDestination.mutateAsync,
    isSettingWithdrawal: setWithdrawalDestination.isPending,
    ownerWithdraw: ownerWithdraw.mutateAsync,
    isOwnerWithdrawing: ownerWithdraw.isPending,
  };
}

