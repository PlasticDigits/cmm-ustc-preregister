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
  open: (uri: string, cb: () => void) => void;
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
    open: (uri: string, _cb: () => void) => {
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
  qrModal.open(luncDashDeepLink, () => {});

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
  return wcInstance !== null && wcInstance.connected && connectedAddress !== null;
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
  fee: { amount: Array<{ denom: string; amount: string }>; gas: string; gas_limit?: string }
): Promise<string> {
  if (!wcInstance || !wcInstance.connected) {
    throw new Error('LuncDash is not connected');
  }

  const id = Date.now();

  // Normalize fee structure - ensure gas_limit is present if gas is provided
  const normalizedFee = {
    ...fee,
    gas_limit: fee.gas_limit || fee.gas,
  };

  console.log('[LuncDash] Sending transaction');
  console.log('[LuncDash] msgs:', JSON.stringify(msgs, null, 2));
  console.log('[LuncDash] fee:', JSON.stringify(normalizedFee, null, 2));
  console.log('[LuncDash] memo:', memo);

  // Try multiple method names and formats that LuncDash might support
  // Start with 'post' as it's the most common for Terra wallets
  const methods = ['post', 'terra_sign', 'terra_signTx'];
  let lastError: Error | null = null;
  
  for (const method of methods) {
    // Try format 1: [msgs, fee, memo] - standard Terra WalletConnect format
    try {
      console.log(`[LuncDash] Trying method: ${method} with format [msgs, fee, memo]`);
      
      const result = await wcInstance.sendCustomRequest({
        id: id + methods.indexOf(method),
        method,
        params: [msgs, normalizedFee, memo],
      });

      console.log(`[LuncDash] Transaction result for ${method}:`, result);

      if (result && result.txhash) {
        return result.txhash;
      }

      if (result && result.txHash) {
        return result.txHash;
      }

      if (typeof result === 'string' && result.length === 64) {
        return result;
      }

      // If we got a result but it's not a hash, log and continue
      console.log(`[LuncDash] Got result but not a hash format, trying next method`);
    } catch (format1Error: unknown) {
      console.log(`[LuncDash] Format 1 failed for ${method}:`, format1Error);
      lastError = format1Error instanceof Error ? format1Error : new Error(String(format1Error));
      
      // Try format 2: Single object with all transaction details
      try {
        console.log(`[LuncDash] Trying method: ${method} with format [txObject]`);
        
        const result = await wcInstance.sendCustomRequest({
          id: id + methods.indexOf(method) + 100,
          method,
          params: [{
            msgs,
            fee: normalizedFee,
            memo,
            chain_id: TERRA_CLASSIC_CHAIN_ID,
          }],
        });

        console.log(`[LuncDash] Transaction result for ${method} (format 2):`, result);

        if (result && result.txhash) {
          return result.txhash;
        }

        if (result && result.txHash) {
          return result.txHash;
        }

        if (typeof result === 'string' && result.length === 64) {
          return result;
        }
      } catch (format2Error: unknown) {
        console.log(`[LuncDash] Format 2 also failed for ${method}:`, format2Error);
        lastError = format2Error instanceof Error ? format2Error : new Error(String(format2Error));
      }
    }
  }

  // If we get here, all methods failed
  console.error('[LuncDash] All transaction methods failed');
  
  if (lastError) {
    // Check if it's a user rejection
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
    
    // Check for the specific LuncDash error
    if (errorMsg.includes('not available') || errorMsg.includes('transaction is not available')) {
      throw new Error('Transaction format may be incompatible with LuncDash. Please check the console for details.');
    }
    
    // Try to parse JSON error messages
    try {
      const parsed = JSON.parse(lastError.message);
      throw new Error(parsed.message || lastError.message);
    } catch {
      throw new Error(lastError.message || 'Unknown error during transaction');
    }
  }
  
  throw new Error('No transaction hash returned from any method');
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

    if (wc.connected && wc.accounts.length > 0) {
      wcInstance = wc;
      connectedAddress = wc.accounts[0];

      // Handle disconnect
      wc.on('disconnect', () => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        wcInstance = null;
        connectedAddress = null;
      });

      return { address: wc.accounts[0] };
    }
  } catch (err) {
    console.error('Failed to restore LuncDash session:', err);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return null;
}

