import type { AppKitNetwork } from '@reown/appkit/networks';
import type { CustomCaipNetwork } from '@reown/appkit-common';
import { UniversalConnector } from '@reown/appkit-universal-connector';
import { BSC_CHAIN_ID, BSC_RPC_URL } from '@/utils/constants';

// Get projectId from https://dashboard.reown.com
export const projectId = '2ce7811b869be33ffad28cff05c93c15';

// Configure BSC network
const bscNetwork: CustomCaipNetwork<'eip155'> = {
  id: BSC_CHAIN_ID,
  chainNamespace: 'eip155' as const,
  caipNetworkId: `eip155:${BSC_CHAIN_ID}`,
  name: 'Binance Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: [BSC_RPC_URL] } },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: BSC_CHAIN_ID === 56 ? 'https://bscscan.com' : 'https://testnet.bscscan.com',
    },
  },
};

export const networks = [bscNetwork] as [AppKitNetwork, ...AppKitNetwork[]];

let universalConnectorInstance: UniversalConnector | null = null;

export async function getUniversalConnector(): Promise<UniversalConnector> {
  if (universalConnectorInstance) {
    return universalConnectorInstance;
  }

  universalConnectorInstance = await UniversalConnector.init({
    projectId,
    metadata: {
      name: 'CMM USTC Preregister',
      description: 'CMM USTC Preregister DApp',
      url: window.location.origin,
      icons: [`${window.location.origin}/icon.png`],
    },
    networks: [
      {
        methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
        chains: [bscNetwork as CustomCaipNetwork],
        events: ['chainChanged', 'accountsChanged'],
        namespace: 'eip155',
      },
    ],
  });

  return universalConnectorInstance;
}

