import { queryContract } from './provider';
import { TERRA_CONTRACT_ADDRESS } from '@/utils/constants';

// Response types matching the CosmWasm contract
export interface GetUserDepositResponse {
  user: string;
  deposit: string;
}

export interface GetUserCountResponse {
  count: number;
}

export interface GetTotalDepositsResponse {
  total: string;
}

export interface GetWithdrawalInfoResponse {
  destination: string | null;
  unlock_timestamp: number;
  is_configured: boolean;
}

export interface GetAllUsersResponse {
  users: [string, string][]; // Array of [address, deposit] tuples
  next: string | null; // Cursor for pagination
}

export interface GetConfigResponse {
  owner: string;
  ustc_denom: string;
}

/**
 * Terra Classic contract service for querying the deployed contract
 */
export class TerraClassicContract {
  private contractAddress: string;

  constructor(contractAddress: string) {
    this.contractAddress = contractAddress;
  }

  /**
   * Get user deposit amount
   */
  async getUserDeposit(userAddress: string): Promise<string> {
    const response = await queryContract<GetUserDepositResponse>(
      this.contractAddress,
      {
        get_user_deposit: {
          user: userAddress,
        },
      }
    );
    return response.deposit;
  }

  /**
   * Get total number of users
   */
  async getUserCount(): Promise<number> {
    const response = await queryContract<GetUserCountResponse>(
      this.contractAddress,
      {
        get_user_count: {},
      }
    );
    return response.count;
  }

  /**
   * Get total deposits across all users
   */
  async getTotalDeposits(): Promise<string> {
    const response = await queryContract<GetTotalDepositsResponse>(
      this.contractAddress,
      {
        get_total_deposits: {},
      }
    );
    return response.total;
  }

  /**
   * Get withdrawal information (destination, unlock timestamp, etc.)
   */
  async getWithdrawalInfo(): Promise<GetWithdrawalInfoResponse> {
    return await queryContract<GetWithdrawalInfoResponse>(
      this.contractAddress,
      {
        get_withdrawal_info: {},
      }
    );
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(startAfter?: string, limit?: number): Promise<GetAllUsersResponse> {
    const query: {
      get_all_users: {
        start_after?: string;
        limit?: number;
      };
    } = {
      get_all_users: {},
    };
    
    if (startAfter) {
      query.get_all_users.start_after = startAfter;
    }
    
    if (limit) {
      query.get_all_users.limit = limit;
    }

    return await queryContract<GetAllUsersResponse>(
      this.contractAddress,
      query
    );
  }

  /**
   * Get contract configuration
   */
  async getConfig(): Promise<GetConfigResponse> {
    return await queryContract<GetConfigResponse>(
      this.contractAddress,
      {
        get_config: {},
      }
    );
  }
}

/**
 * Get a Terra Classic contract instance
 */
export function getTerraClassicContract(): TerraClassicContract {
  if (!TERRA_CONTRACT_ADDRESS) {
    throw new Error('Terra Classic contract address not configured');
  }
  return new TerraClassicContract(TERRA_CONTRACT_ADDRESS);
}

