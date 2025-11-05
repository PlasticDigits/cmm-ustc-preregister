import { TERRA_LCD_URL } from '@/utils/constants';

const USTC_DENOM = 'uusd'; // microUSTC

/**
 * Get USTC balance for a Terra Classic address
 * @param address - The Terra Classic address
 * @returns Balance in USTC (6 decimals)
 */
export async function getUSTCBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`${TERRA_LCD_URL}/cosmos/bank/v1beta1/balances/${address}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.status}`);
    }

    const data = await response.json();
    const uusdBalance = data.balances?.find((b: any) => b.denom === USTC_DENOM);
    
    if (!uusdBalance) {
      return '0';
    }

    // Convert from microUSTC to USTC (divide by 1,000,000)
    const balance = parseFloat(uusdBalance.amount) / 1_000_000;
    return balance.toString();
  } catch (error: any) {
    console.error('Error fetching USTC balance:', error);
    return '0';
  }
}

