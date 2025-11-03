import { ethers } from 'ethers';
import { BSC_RPC_URL } from '@/utils/constants';

let provider: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
  }
  return provider;
}

export function getBrowserProvider(): ethers.BrowserProvider | null {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }
  return new ethers.BrowserProvider(window.ethereum);
}



