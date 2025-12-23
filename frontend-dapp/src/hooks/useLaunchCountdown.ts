import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTerraClassicContract } from '@/services/terraclassic/contract';

// 24 hours in seconds
const LAUNCH_DELAY_SECONDS = 24 * 60 * 60;

export type CountdownPhase = 'preregistration' | 'launch' | 'launched';

/**
 * Hook to track USTR countdown with two phases:
 * 1. Preregistration countdown - until contract unlock timestamp
 * 2. USTR Launch countdown - 24 hours after preregistration closes
 * @returns Countdown state including phase, time remaining, destination, and status
 */
export function useLaunchCountdown() {
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));
  
  // Query withdrawal info from Terra Classic contract
  const { data: withdrawalInfo, isLoading } = useQuery({
    queryKey: ['terraclassic', 'launchWithdrawalInfo'],
    queryFn: async () => {
      const contract = getTerraClassicContract();
      return await contract.getWithdrawalInfo();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
  
  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const preregistrationCloseTimestamp = withdrawalInfo?.unlock_timestamp || 0;
  const launchTimestamp = preregistrationCloseTimestamp + LAUNCH_DELAY_SECONDS;
  const destinationAddress = withdrawalInfo?.destination || null;
  const isConfigured = withdrawalInfo?.is_configured || false;
  
  // Determine current phase
  const phase = useMemo((): CountdownPhase => {
    if (!isConfigured || !preregistrationCloseTimestamp) return 'preregistration';
    
    if (currentTime < preregistrationCloseTimestamp) {
      return 'preregistration';
    } else if (currentTime < launchTimestamp) {
      return 'launch';
    } else {
      return 'launched';
    }
  }, [currentTime, preregistrationCloseTimestamp, launchTimestamp, isConfigured]);
  
  // Time remaining for current phase
  const timeRemaining = useMemo(() => {
    if (!isConfigured || !preregistrationCloseTimestamp) return null;
    
    if (phase === 'preregistration') {
      const remaining = preregistrationCloseTimestamp - currentTime;
      return remaining > 0 ? remaining : 0;
    } else if (phase === 'launch') {
      const remaining = launchTimestamp - currentTime;
      return remaining > 0 ? remaining : 0;
    } else {
      return 0;
    }
  }, [currentTime, preregistrationCloseTimestamp, launchTimestamp, phase, isConfigured]);
  
  // Preregistration is closed (for disabling deposit/withdraw buttons)
  const isPreregistrationClosed = useMemo(() => {
    return isConfigured && phase !== 'preregistration';
  }, [phase, isConfigured]);
  
  // USTR has fully launched
  const isLaunched = useMemo(() => {
    return phase === 'launched';
  }, [phase]);
  
  const preregistrationCloseDate = useMemo(() => {
    if (!preregistrationCloseTimestamp) return null;
    return new Date(preregistrationCloseTimestamp * 1000);
  }, [preregistrationCloseTimestamp]);
  
  const launchDate = useMemo(() => {
    if (!launchTimestamp) return null;
    return new Date(launchTimestamp * 1000);
  }, [launchTimestamp]);
  
  return {
    phase,
    timeRemaining,
    isPreregistrationClosed,
    isLaunched,
    preregistrationCloseTimestamp,
    launchTimestamp,
    preregistrationCloseDate,
    launchDate,
    destinationAddress,
    isConfigured,
    isLoading,
  };
}
