export function validateAmount(amount: string): { valid: boolean; error?: string } {
  if (!amount || amount.trim() === '') {
    return { valid: false, error: 'Amount is required' };
  }
  
  const num = parseFloat(amount);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Invalid amount' };
  }
  
  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  return { valid: true };
}

export function validateAddress(address: string): { valid: boolean; error?: string } {
  if (!address || address.trim() === '') {
    return { valid: false, error: 'Address is required' };
  }
  
  // Ethereum address validation
  if (address.startsWith('0x') && address.length !== 42) {
    return { valid: false, error: 'Invalid Ethereum address format' };
  }
  
  // Terra address validation (starts with terra1)
  if (address.startsWith('terra1') && address.length !== 44) {
    return { valid: false, error: 'Invalid Terra address format' };
  }
  
  return { valid: true };
}

export function isZeroAddress(address: string): boolean {
  if (!address) return true;
  return address === '0x0000000000000000000000000000000000000000' || address === '';
}

