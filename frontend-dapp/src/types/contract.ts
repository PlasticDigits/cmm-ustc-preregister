export interface BSCContractConfig {
  address: string;
  abi: any[];
  chainId: number;
}

export interface TerraContractConfig {
  address: string;
  codeId: string;
  chainId: string;
}

export interface UserDeposit {
  address: string;
  amount: string;
}

export interface ContractStats {
  totalDeposits: string;
  totalUsers: number;
  contractBalance: string;
}



