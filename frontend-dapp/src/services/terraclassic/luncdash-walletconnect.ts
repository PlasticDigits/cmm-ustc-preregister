/**
 * Custom LuncDash WalletConnect implementation that works without requiring
 * the public key upfront (which fails for accounts without on-chain history).
 */
import WalletConnect from '@walletconnect/legacy-client';
import type { IWalletConnectSession } from '@walletconnect/legacy-types';
import { TERRA_RPC_URL } from '@/utils/constants';

const LUNCDASH_BRIDGE = 'https://walletconnect.luncdash.com';
const SESSION_STORAGE_KEY = 'luncdash.wcSession';
export const TERRA_CLASSIC_CHAIN_ID = 'columbus-5';

// Store the WalletConnect instance
let wcInstance: WalletConnect | null = null;
let connectedAddress: string | null = null;

interface QRCodeModal {
  open: (uri: string) => void;
  close: () => void;
  onCancel: (callback: () => void) => void;
}

/**
 * Create a simple QR code modal for WalletConnect
 */
function createQRCodeModal(): QRCodeModal {
  let modalElement: HTMLDivElement | null = null;
  let cancelCallback: (() => void) | null = null;

  return {
    onCancel: (callback: () => void) => {
      cancelCallback = callback;
    },
    open: (uri: string) => {
      // Create modal overlay
      modalElement = document.createElement('div');
      modalElement.id = 'luncdash-qr-modal';
      modalElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      `;

      // Create modal content
      const content = document.createElement('div');
      content.style.cssText = `
        background: #1a1a2e;
        border-radius: 16px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        text-align: center;
        border: 1px solid rgba(255, 215, 0, 0.3);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      `;

      // Title
      const title = document.createElement('h3');
      title.textContent = 'Connect LuncDash';
      title.style.cssText = `
        color: #ffd700;
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
      `;
      content.appendChild(title);

      // Instructions
      const instructions = document.createElement('p');
      instructions.textContent = 'Scan this QR code with LuncDash app';
      instructions.style.cssText = `
        color: #a0a0a0;
        margin: 0 0 1.5rem 0;
        font-size: 0.95rem;
      `;
      content.appendChild(instructions);

      // QR Code container
      const qrContainer = document.createElement('div');
      qrContainer.style.cssText = `
        background: white;
        padding: 16px;
        border-radius: 12px;
        display: inline-block;
        margin-bottom: 1.5rem;
      `;

      // Generate QR code using a simple QR code library or API
      // The URI passed here is already the full LuncDash deep link
      const qrImg = document.createElement('img');
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
      qrImg.alt = 'WalletConnect QR Code';
      qrImg.style.cssText = `
        width: 200px;
        height: 200px;
        display: block;
      `;
      qrContainer.appendChild(qrImg);
      content.appendChild(qrContainer);

      // Copy URI button
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy Connection URI';
      copyBtn.style.cssText = `
        background: transparent;
        border: 1px solid rgba(255, 215, 0, 0.5);
        color: #ffd700;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        width: 100%;
        transition: all 0.2s;
      `;
      copyBtn.onmouseover = () => {
        copyBtn.style.background = 'rgba(255, 215, 0, 0.1)';
      };
      copyBtn.onmouseout = () => {
        copyBtn.style.background = 'transparent';
      };
      copyBtn.onclick = async () => {
        await navigator.clipboard.writeText(uri);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Connection URI';
        }, 2000);
      };
      content.appendChild(copyBtn);

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Cancel';
      closeBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #a0a0a0;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        width: 100%;
        transition: all 0.2s;
      `;
      closeBtn.onmouseover = () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.15)';
      };
      closeBtn.onmouseout = () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      };
      closeBtn.onclick = () => {
        if (modalElement) {
          document.body.removeChild(modalElement);
          modalElement = null;
        }
        if (cancelCallback) {
          cancelCallback();
        }
      };
      content.appendChild(closeBtn);

      modalElement.appendChild(content);
      document.body.appendChild(modalElement);
    },
    close: () => {
      if (modalElement) {
        document.body.removeChild(modalElement);
        modalElement = null;
      }
    },
  };
}

/**
 * Connect to LuncDash via WalletConnect
 */
export async function connectLuncDash(): Promise<{ address: string }> {
  // Clear any stale sessions first
  localStorage.removeItem(SESSION_STORAGE_KEY);
  
  // Create QR code modal
  const qrModal = createQRCodeModal();

  // Create WalletConnect instance WITHOUT qrcodeModal - we'll handle it manually
  // Include client metadata that LuncDash expects
  const wc = new WalletConnect({
    bridge: LUNCDASH_BRIDGE,
    clientMeta: {
      name: 'USTC Preregister',
      description: 'CMM USTC Preregister DApp',
      url: window.location.origin,
      icons: [`${window.location.origin}/logo-bg-transparent.svg`],
    },
  });

  console.log('[LuncDash] Created WalletConnect instance');

  // Handle disconnect
  wc.on('disconnect', () => {
    console.log('[LuncDash] Disconnect event');
    localStorage.removeItem(SESSION_STORAGE_KEY);
    wcInstance = null;
    connectedAddress = null;
  });

  // Kill existing session if any
  if (wc.connected) {
    console.log('[LuncDash] Killing existing session');
    await wc.killSession();
  }

  // Create new session
  console.log('[LuncDash] Creating session...');
  await wc.createSession();
  console.log('[LuncDash] Session created, URI:', wc.uri);
  
  // Manually show the QR code with the LuncDash deep link format
  // The WC URI needs to be DOUBLE-encoded, and payload= needs the = encoded as %3D
  const doubleEncodedUri = encodeURIComponent(encodeURIComponent(wc.uri));
  const luncDashDeepLink = `luncdash://wallet_connect?payload%3D${doubleEncodedUri}`;
  console.log('[LuncDash] Deep link for QR:', luncDashDeepLink);
  qrModal.open(luncDashDeepLink);

  // Wait for connection
  return new Promise((resolve, reject) => {
    let isResolved = false;

    const handleSuccess = () => {
      if (isResolved) return;
      
      console.log('[LuncDash] Connection successful, accounts:', wc.accounts);
      
      if (wc.accounts.length === 0) {
        console.error('[LuncDash] No accounts in session');
        reject(new Error('No accounts returned from LuncDash'));
        return;
      }

      isResolved = true;
      qrModal.close();

      const address = wc.accounts[0];

      // Cache session
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(wc.session));

      // Store references
      wcInstance = wc;
      connectedAddress = address;

      resolve({ address });
    };

    // Handle cancel button click
    qrModal.onCancel(async () => {
      if (isResolved) return;
      isResolved = true;
      try {
        if (wc.connected) {
          await wc.killSession();
        }
      } catch {
        // Ignore errors during cleanup
      }
      reject(new Error('Connection cancelled by user'));
    });

    // Listen for ALL WalletConnect transport events for debugging
    wc.on('transport_open', () => {
      console.log('[LuncDash] Transport opened');
    });
    
    wc.on('transport_close', () => {
      console.log('[LuncDash] Transport closed');
    });
    
    wc.on('transport_error', (error: unknown) => {
      console.error('[LuncDash] Transport error:', error);
    });

    // Main connect event
    wc.on('connect', (error, payload) => {
      console.log('[LuncDash] Connect event received:', { error, payload, connected: wc.connected, accounts: wc.accounts });
      
      if (error) {
        console.error('[LuncDash] Connect error:', error);
        if (!isResolved) {
          isResolved = true;
          qrModal.close();
          reject(error);
        }
        return;
      }

      handleSuccess();
    });

    // Also listen for session_update in case connect doesn't fire
    wc.on('session_update', (error, payload) => {
      console.log('[LuncDash] Session update event:', { error, payload, connected: wc.connected, accounts: wc.accounts });
      
      if (!error && wc.connected && wc.accounts.length > 0) {
        handleSuccess();
      }
    });
    
    // Listen for session_request (when wallet approves)
    wc.on('session_request', (error, payload) => {
      console.log('[LuncDash] Session request event:', { error, payload });
    });
    
    // Listen for call_request (for any RPC calls)
    wc.on('call_request', (error, payload) => {
      console.log('[LuncDash] Call request event:', { error, payload });
    });
    
    // Listen for wc_sessionRequest
    wc.on('wc_sessionRequest', (error, payload) => {
      console.log('[LuncDash] WC Session request event:', { error, payload });
    });

    // Handle session rejection
    wc.on('disconnect', () => {
      console.log('[LuncDash] Disconnect event received');
      if (isResolved) return;
      isResolved = true;
      qrModal.close();
      reject(new Error('Connection rejected'));
    });

    // Also check periodically if connection was established (fallback)
    const checkConnection = setInterval(() => {
      if (isResolved) {
        clearInterval(checkConnection);
        return;
      }
      
      // Log current state for debugging
      console.log('[LuncDash] Polling check:', {
        connected: wc.connected,
        accounts: wc.accounts,
        session: wc.session ? 'exists' : 'null',
        peerMeta: wc.peerMeta,
      });
      
      if (wc.connected && wc.accounts.length > 0) {
        console.log('[LuncDash] Connection detected via polling');
        clearInterval(checkConnection);
        handleSuccess();
      }
      
      // Also check if session exists with accounts even if connected flag is false
      if (wc.session && wc.session.accounts && wc.session.accounts.length > 0) {
        console.log('[LuncDash] Session with accounts detected via polling');
        clearInterval(checkConnection);
        // Manually set connected state
        connectedAddress = wc.session.accounts[0];
        wcInstance = wc;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(wc.session));
        if (!isResolved) {
          isResolved = true;
          qrModal.close();
          resolve({ address: wc.session.accounts[0] });
        }
      }
    }, 500); // Check every 500ms

    // Clear the interval after 2 minutes (timeout)
    setTimeout(() => {
      clearInterval(checkConnection);
      if (!isResolved) {
        console.log('[LuncDash] Connection timeout');
        isResolved = true;
        qrModal.close();
        reject(new Error('Connection timeout'));
      }
    }, 120000);
  });
}

/**
 * Disconnect from LuncDash
 */
export async function disconnectLuncDash(): Promise<void> {
  if (wcInstance && wcInstance.connected) {
    await wcInstance.killSession();
  }
  localStorage.removeItem(SESSION_STORAGE_KEY);
  wcInstance = null;
  connectedAddress = null;
}

/**
 * Get current connected address
 */
export function getLuncDashAddress(): string | null {
  return connectedAddress;
}

/**
 * Check if LuncDash is connected
 */
export function isLuncDashConnected(): boolean {
  const isConnected = wcInstance !== null && wcInstance.connected && connectedAddress !== null;
  
  // Also check if session exists even if connected flag is false
  const hasSession = wcInstance !== null && wcInstance.session !== null;
  
  // Return true if either connected flag is true OR we have a session with address
  return isConnected || (hasSession && connectedAddress !== null);
}

/**
 * Sign and broadcast a transaction via LuncDash
 * @param msgs - The messages to send
 * @param memo - Optional memo
 * @param fee - Fee object
 */
export async function signAndBroadcastTx(
  msgs: unknown[],
  memo: string = '',
  fee: { amount: Array<{ denom: string; amount: string }>; gasLimit: string; payer?: string; granter?: string }
): Promise<string> {
  // If wcInstance is null but we have a stored session, try to restore it
  if (!wcInstance) {
    console.log('[LuncDash] wcInstance is null, attempting to restore session...');
    const restored = await restoreLuncDashSession();
    if (!restored) {
      throw new Error('LuncDash is not connected');
    }
    console.log('[LuncDash] Session restored successfully');
  }

  // Check connection state
  if (!wcInstance) {
    throw new Error('LuncDash is not connected');
  }

  // If connected flag is false but we have a session, try to use it anyway
  if (!wcInstance.connected && wcInstance.session && connectedAddress) {
    console.log('[LuncDash] wcInstance.connected is false but session exists, attempting to use session');
  } else if (!wcInstance.connected) {
    throw new Error('LuncDash is not connected');
  }

  const id = Date.now();

  console.log('[LuncDash] Sending transaction');
  console.log('[LuncDash] msgs:', JSON.stringify(msgs, null, 2));
  console.log('[LuncDash] fee:', JSON.stringify(fee, null, 2));
  console.log('[LuncDash] memo:', memo);

  // Convert fee to the format expected by WalletConnect
  const walletConnectFee = {
    amount: fee.amount,
    gasLimit: fee.gasLimit,
    payer: fee.payer || '',
    granter: fee.granter || '',
  };

  // The browser wallet format wraps msgs and memo in a transaction object:
  // { msgs: [...], memo: "" }
  // Then fee is passed separately
  const txObject = {
    msgs: msgs,
    memo: memo,
  };

  // Try multiple param formats that LuncDash might accept
  const paramFormats = [
    // Format 1: Transaction object + fee (matches browser wallet structure)
    { name: 'tx object + fee', params: [txObject, walletConnectFee] },
    // Format 2: Single combined object
    { name: 'combined object', params: [{ ...txObject, fee: walletConnectFee }] },
    // Format 3: Separate params [msgs, fee, memo] (original Terra format)
    { name: 'separate params', params: [msgs, walletConnectFee, memo] },
  ];

  let lastError: Error | null = null;

  for (const format of paramFormats) {
    try {
      console.log(`[LuncDash] Trying "post" method with format: ${format.name}`);
      console.log('[LuncDash] Params:', JSON.stringify(format.params, null, 2));
      
      const result = await wcInstance.sendCustomRequest({
        id: id + paramFormats.indexOf(format),
        method: 'post',
        params: format.params,
      });

      console.log('[LuncDash] Transaction result:', result);

      if (result && result.txhash) {
        return result.txhash;
      }

      if (result && result.txHash) {
        return result.txHash;
      }

      if (typeof result === 'string' && result.length === 64) {
        return result;
      }

      console.log('[LuncDash] Got result but not a hash format, trying next format');
    } catch (err: unknown) {
      console.log(`[LuncDash] Format "${format.name}" failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Check if it's a user rejection - stop trying other formats
      const errorMsg = lastError.message.toLowerCase();
      if (
        errorMsg.includes('user rejected') ||
        errorMsg.includes('rejected') ||
        errorMsg.includes('user denied') ||
        errorMsg.includes('cancelled') ||
        errorMsg.includes('canceled')
      ) {
        throw new Error('Transaction rejected by user');
      }
      
      // Continue to next format
    }
  }

  // All formats failed
  console.error('[LuncDash] All transaction formats failed');
  
  if (lastError) {
    // Try to parse JSON error messages
    try {
      const parsed = JSON.parse(lastError.message);
      throw new Error(parsed.message || lastError.message);
    } catch {
      throw new Error(lastError.message || 'Unknown error during transaction');
    }
  }
  
  throw new Error('No transaction hash returned from any format');
}

/**
 * Test a specific transaction format and method via LuncDash
 * @param testIndex - Index of the test combination (method + format)
 * @param senderAddress - The sender's address
 */
export async function testTransactionFormat(
  testIndex: number,
  senderAddress: string
): Promise<string> {
  // If wcInstance is null but we have a stored session, try to restore it
  if (!wcInstance) {
    const restored = await restoreLuncDashSession();
    if (!restored) {
      throw new Error('LuncDash is not connected');
    }
  }

  if (!wcInstance) {
    throw new Error('LuncDash is not connected');
  }

  if (!wcInstance.connected && wcInstance.session && connectedAddress) {
    console.log('[LuncDash] Using session despite connected flag being false');
  } else if (!wcInstance.connected) {
    throw new Error('LuncDash is not connected');
  }

  const id = Date.now();

  // Fee with gas
  const fee = {
    amount: [{ denom: 'uluna', amount: '50000' }],
    gas: '100000',
  };

  // Simple bank send message (1 uluna to self - minimal test)
  const bankSendMsg = {
    type: 'bank/MsgSend',
    value: {
      from_address: senderAddress,
      to_address: senderAddress, // Send to self
      amount: [{ denom: 'uluna', amount: '1' }],
    },
  };

  // Alternative bank send format
  const bankSendMsg2 = {
    type: 'cosmos-sdk/MsgSend',
    value: {
      from_address: senderAddress,
      to_address: senderAddress,
      amount: [{ denom: 'uluna', amount: '1' }],
    },
  };

  // Contract execute message
  const contractMsg = {
    type: 'wasm/MsgExecuteContract',
    value: {
      sender: senderAddress,
      contract: 'terra1j4y03s9tly2qfu5hv5pfga9yls0ygjnl97cznvedw3ervh3t7ntqfl7q9z',
      msg: { deposit: {} },
      funds: [{ denom: 'uusd', amount: '50000000' }],
    },
  };

  // Contract execute with base64 encoded msg
  const contractMsgBase64 = {
    type: 'wasm/MsgExecuteContract',
    value: {
      sender: senderAddress,
      contract: 'terra1j4y03s9tly2qfu5hv5pfga9yls0ygjnl97cznvedw3ervh3t7ntqfl7q9z',
      msg: btoa(JSON.stringify({ deposit: {} })),
      funds: [{ denom: 'uusd', amount: '50000000' }],
    },
  };

  // Define all test combinations
  const testCombinations = [
    // Test 0: Bank send (simple transfer) - format 1
    { 
      params: [{ msgs: [bankSendMsg], memo: '' }, fee], 
      name: 'BANK SEND: {msgs,memo} + fee' 
    },
    // Test 1: Bank send - format 2 (combined)
    { 
      params: [{ msgs: [bankSendMsg], memo: '', fee }], 
      name: 'BANK SEND: {msgs,memo,fee}' 
    },
    // Test 2: Bank send - format 3 (array)
    { 
      params: [[bankSendMsg], fee, ''], 
      name: 'BANK SEND: [msgs, fee, memo]' 
    },
    // Test 3: Bank send cosmos-sdk type
    { 
      params: [{ msgs: [bankSendMsg2], memo: '', fee }], 
      name: 'BANK SEND cosmos-sdk type' 
    },
    // Test 4: Contract execute - format 1
    { 
      params: [{ msgs: [contractMsg], memo: '' }, fee], 
      name: 'CONTRACT: {msgs,memo} + fee' 
    },
    // Test 5: Contract execute - format 2
    { 
      params: [{ msgs: [contractMsg], memo: '', fee }], 
      name: 'CONTRACT: {msgs,memo,fee}' 
    },
    // Test 6: Contract with base64 msg
    { 
      params: [{ msgs: [contractMsgBase64], memo: '', fee }], 
      name: 'CONTRACT: base64 msg' 
    },
    // Test 7: Just message directly (no wrapper)
    { 
      params: [bankSendMsg], 
      name: 'BANK SEND: raw message only' 
    },
    // Test 8: Message + fee only
    { 
      params: [bankSendMsg, fee], 
      name: 'BANK SEND: msg + fee' 
    },
    // Test 9: Empty params to see what error we get
    { 
      params: [], 
      name: 'EMPTY: see error response' 
    },
  ];

  const test = testCombinations[testIndex];

  if (!test) {
    throw new Error(`Invalid test index: ${testIndex}. Valid: 0-${testCombinations.length - 1}`);
  }

  console.log(`[LuncDash] Test ${testIndex}: ${test.name}`);
  console.log('[LuncDash] Method: post');
  console.log('[LuncDash] Params:', JSON.stringify(test.params, null, 2));

  try {
    const result = await wcInstance.sendCustomRequest({
      id,
      method: 'post',
      params: test.params,
    });

    console.log('[LuncDash] Transaction result:', result);

    if (result && result.txhash) {
      return result.txhash;
    }

    if (result && result.txHash) {
      return result.txHash;
    }

    if (typeof result === 'string' && result.length === 64) {
      return result;
    }

    // Log full result for debugging
    console.log('[LuncDash] Full result object:', JSON.stringify(result, null, 2));
    throw new Error(`Unexpected result: ${JSON.stringify(result)}`);
  } catch (err: unknown) {
    console.error(`[LuncDash] Test ${testIndex} failed:`, err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err));
  }
}

/**
 * Get the number of available test combinations
 */
export function getTestCount(): number {
  return 10;
}

/**
 * Get test name by index
 */
export function getTestName(index: number): string {
  const names = [
    'BANK SEND: {msgs,memo} + fee',
    'BANK SEND: {msgs,memo,fee}',
    'BANK SEND: [msgs, fee, memo]',
    'BANK SEND cosmos-sdk type',
    'CONTRACT: {msgs,memo} + fee',
    'CONTRACT: {msgs,memo,fee}',
    'CONTRACT: base64 msg',
    'BANK SEND: raw message only',
    'BANK SEND: msg + fee',
    'EMPTY: see error response',
  ];
  return names[index] || `Test ${index}`;
}

/**
 * Get the RPC URL for Terra Classic
 */
export function getTerraRpcUrl(): string {
  return TERRA_RPC_URL;
}

/**
 * Get the chain ID
 */
export function getChainId(): string {
  return TERRA_CLASSIC_CHAIN_ID;
}

/**
 * Restore session from storage if available
 */
export async function restoreLuncDashSession(): Promise<{ address: string } | null> {
  const cachedSession = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!cachedSession) {
    return null;
  }

  try {
    const session = JSON.parse(cachedSession) as IWalletConnectSession;

    const wc = new WalletConnect({
      bridge: LUNCDASH_BRIDGE,
      signingMethods: [],
      session,
    });

    // Restore if we have accounts, even if connected flag is false
    // The session might still be valid for signing
    if (wc.accounts && wc.accounts.length > 0) {
      wcInstance = wc;
      connectedAddress = wc.accounts[0];

      console.log('[LuncDash] Session restored:', {
        connected: wc.connected,
        accounts: wc.accounts,
        address: wc.accounts[0],
      });

      // Handle disconnect
      wc.on('disconnect', () => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        wcInstance = null;
        connectedAddress = null;
      });

      return { address: wc.accounts[0] };
    } else {
      console.log('[LuncDash] Session exists but no accounts found');
    }
  } catch (err) {
    console.error('Failed to restore LuncDash session:', err);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return null;
}

