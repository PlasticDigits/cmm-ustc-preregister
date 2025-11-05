import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { CosmosTxV1beta1Fee as Fee } from '@goblinhunt/cosmes/protobufs';
import { TERRA_CONTRACT_ADDRESS } from '@/utils/constants';
import { getConnectedWallet } from './wallet';

const USTC_DENOM = 'uusd'; // microUSTC

// Terra Classic gas configuration
// Since Terra Classic LCD doesn't support /cosmos/tx/v1beta1/simulate (returns 501),
// we use fixed gas limits based on transaction type
const GAS_PRICE_ULUNA = '28.325'; // uluna per gas unit
const BASE_GAS_LIMIT = 200000; // Base gas for contract execution
const DEPOSIT_GAS_LIMIT = 250000; // Gas for deposit (includes coin transfer)
const WITHDRAW_GAS_LIMIT = 200000; // Gas for withdraw
const OWNER_GAS_LIMIT = 150000; // Gas for owner operations

/**
 * Estimate fee for Terra Classic transaction
 * Terra Classic LCD doesn't support simulation endpoint, so we use fixed gas limits
 */
function estimateTerraClassicFee(gasLimit: number): Fee {
  // Calculate fee amount: gasLimit * gasPrice
  const feeAmount = Math.ceil(parseFloat(GAS_PRICE_ULUNA) * gasLimit);
  
  return new Fee({
    amount: [
      {
        amount: feeAmount.toString(),
        denom: 'uluna',
      },
    ],
    gasLimit: BigInt(gasLimit),
  });
}

/**
 * Determine gas limit based on transaction type
 */
function getGasLimitForTx(executeMsg: Record<string, unknown>): number {
  if ('deposit' in executeMsg) {
    return DEPOSIT_GAS_LIMIT;
  } else if ('withdraw' in executeMsg) {
    return WITHDRAW_GAS_LIMIT;
  } else if ('owner_withdraw' in executeMsg || 'set_withdrawal_destination' in executeMsg) {
    return OWNER_GAS_LIMIT;
  }
  return BASE_GAS_LIMIT;
}

/**
 * Execute a Terra Classic contract transaction using cosmes
 * @param walletAddress - The wallet address executing the transaction
 * @param executeMsg - The execute message for the contract
 * @param coins - Coins to send with the transaction (for deposit)
 * @returns Transaction hash
 */
export async function executeTerraContract(
  walletAddress: string,
  executeMsg: Record<string, unknown>,
  coins?: Array<{ denom: string; amount: string }>
): Promise<string> {
  const wallet = getConnectedWallet();
  if (!wallet) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  if (wallet.address !== walletAddress) {
    throw new Error('Wallet address mismatch');
  }

  try {
    // Create the MsgExecuteContract message
    const msg = new MsgExecuteContract({
      sender: walletAddress,
      contract: TERRA_CONTRACT_ADDRESS,
      msg: executeMsg,
      funds: coins && coins.length > 0 ? coins : [],
    });

    // Create unsigned transaction
    const unsignedTx: UnsignedTx = {
      msgs: [msg],
      memo: '',
    };

    // Estimate fee using fixed gas limits (Terra Classic doesn't support simulation)
    // Terra Classic LCD returns 501 for /cosmos/tx/v1beta1/simulate endpoint
    const gasLimit = getGasLimitForTx(executeMsg);
    const fee = estimateTerraClassicFee(gasLimit);

    // Broadcast transaction
    const txHash = await wallet.broadcastTx(unsignedTx, fee);

    // Poll for transaction confirmation
    const { txResponse } = await wallet.pollTx(txHash);

    // Check if transaction failed
    if (txResponse.code !== 0) {
      const errorMsg =
        txResponse.rawLog ||
        txResponse.logs?.[0]?.log ||
        `Transaction failed with code ${txResponse.code}`;
      throw new Error(`Transaction failed: ${errorMsg}`);
    }

    return txHash;
  } catch (error: unknown) {
    // Enhanced error handling with detailed messages
    console.error('Terra Classic transaction error:', error);

    if (error instanceof Error) {
      const errorMessage = error.message;

      // User rejection errors
      if (
        errorMessage.includes('User rejected') ||
        errorMessage.includes('rejected') ||
        errorMessage.includes('User denied') ||
        errorMessage.includes('user rejected')
      ) {
        throw new Error('Transaction rejected by user');
      }

      // Network/connection errors
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('network')
      ) {
        throw new Error(
          `Network error: ${errorMessage}. Please check your internet connection and try again.`
        );
      }

      // Include full error message for debugging
      throw new Error(`Transaction failed: ${errorMessage}`);
    }

    throw new Error(`Transaction failed: ${String(error)}`);
  }
}

/**
 * Deposit USTC tokens to the contract
 * @param walletAddress - The wallet address depositing
 * @param amount - Amount in USTC (will be converted to microUSTC)
 * @returns Transaction hash
 */
export async function depositUSTC(
  walletAddress: string,
  amount: string
): Promise<string> {
  // Convert amount to microUSTC (6 decimals)
  const microUSTC = Math.floor(parseFloat(amount) * 1_000_000).toString();

  const coins = [
    {
      denom: USTC_DENOM,
      amount: microUSTC,
    },
  ];

  return executeTerraContract(walletAddress, { deposit: {} }, coins);
}

/**
 * Withdraw USTC tokens from the contract
 * @param walletAddress - The wallet address withdrawing
 * @param amount - Amount in USTC (will be converted to microUSTC)
 * @returns Transaction hash
 */
export async function withdrawUSTC(
  walletAddress: string,
  amount: string
): Promise<string> {
  // Convert amount to microUSTC (6 decimals)
  const microUSTC = Math.floor(parseFloat(amount) * 1_000_000).toString();

  return executeTerraContract(
    walletAddress,
    { withdraw: { amount: microUSTC } },
    undefined
  );
}

/**
 * Owner: Set withdrawal destination and unlock timestamp
 * @param walletAddress - The wallet address (must be owner)
 * @param destination - Destination address for withdrawals
 * @param unlockTimestamp - Unix timestamp when withdrawal becomes available (must be at least 7 days in future)
 * @returns Transaction hash
 */
export async function setWithdrawalDestination(
  walletAddress: string,
  destination: string,
  unlockTimestamp: number
): Promise<string> {
  return executeTerraContract(
    walletAddress,
    {
      set_withdrawal_destination: {
        destination,
        unlock_timestamp: unlockTimestamp,
      },
    },
    undefined
  );
}

/**
 * Owner: Withdraw all accumulated USTC tokens to withdrawal destination
 * @param walletAddress - The wallet address (must be owner)
 * @returns Transaction hash
 */
export async function ownerWithdraw(walletAddress: string): Promise<string> {
  return executeTerraContract(
    walletAddress,
    { owner_withdraw: {} },
    undefined
  );
}
