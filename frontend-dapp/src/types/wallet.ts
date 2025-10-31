export interface BSCWallet {
  address: string;
  isConnected: boolean;
  chainId: number;
  provider: any;
  signer: any;
}

export interface TerraWallet {
  address: string;
  isConnected: boolean;
  network: string;
  terra: any;
}

