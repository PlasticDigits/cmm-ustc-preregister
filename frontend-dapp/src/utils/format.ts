import { formatUnits, parseUnits } from 'ethers';

const DECIMALS = 18;

export function formatTokenAmount(amount: bigint | string, decimals: number = DECIMALS): string {
  try {
    const formatted = formatUnits(amount, decimals);
    // Remove trailing zeros
    return formatted.replace(/\.?0+$/, '');
  } catch {
    return '0';
  }
}

export function formatAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!address || address.length < startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

export function formatBalance(balance: bigint | string, decimals: number = DECIMALS, precision: number = 4): string {
  try {
    const formatted = formatUnits(balance, decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    
    return num.toFixed(precision).replace(/\.?0+$/, '');
  } catch {
    return '0';
  }
}

export function parseTokenAmount(amount: string, decimals: number = DECIMALS): bigint {
  try {
    if (!amount || amount === '') return 0n;
    return parseUnits(amount, decimals);
  } catch {
    return 0n;
  }
}

export function truncateNumber(num: number | string, decimals: number = 2): string {
  const numStr = typeof num === 'string' ? num : num.toString();
  const parts = numStr.split('.');
  if (parts.length === 1) return numStr;
  return `${parts[0]}.${parts[1].slice(0, decimals)}`;
}



