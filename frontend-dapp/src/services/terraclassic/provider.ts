import { TERRA_LCD_URL } from '@/utils/constants';

/**
 * Query a Terra Classic CosmWasm contract using the LCD API
 * Terra Classic uses /terra/wasm/v1beta1 endpoint format
 * @param contractAddress - The contract address to query
 * @param queryMsg - The query message as an object
 * @returns The query response
 */
export async function queryContract<T = any>(
  contractAddress: string,
  queryMsg: Record<string, any>
): Promise<T> {
  // Terra Classic uses /terra/wasm/v1beta1 endpoint
  const url = `${TERRA_LCD_URL}/terra/wasm/v1beta1/contracts/${contractAddress}/store`;
  
  // Encode query message as base64 (Terra Classic LCD expects base64)
  const queryMsgBase64 = btoa(JSON.stringify(queryMsg));
  
  const response = await fetch(`${url}?query_msg=${encodeURIComponent(queryMsgBase64)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Terra Classic query failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  // Terra Classic returns data directly in data field
  return data.data as T;
}

