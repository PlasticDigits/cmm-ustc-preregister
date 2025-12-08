/**
 * TerraStation WalletConnect implementation using Firebase Dynamic Links
 */
import WalletConnect from '@walletconnect/legacy-client';
import type { IWalletConnectSession } from '@walletconnect/legacy-types';

const TERRA_BRIDGE = 'https://walletconnect.terra.dev';
const SESSION_STORAGE_KEY = 'terrastation.wcSession';

// Store the WalletConnect instance
let wcInstance: WalletConnect | null = null;
let connectedAddress: string | null = null;

interface QRCodeModal {
  open: (uri: string, cb: () => void) => void;
  close: () => void;
  onCancel: (callback: () => void) => void;
}

/**
 * Create the Firebase Dynamic Link for TerraStation
 */
function createTerraStationDeepLink(wcUri: string): string {
  // TerraStation uses Firebase Dynamic Links
  // Format: https://terrastation.page.link/?link=https://terra.money?action=wallet_connect&payload=<encoded>&apn=...&ibi=...&isi=...
  const encodedPayload = encodeURIComponent(wcUri);
  const innerLink = `https://terra.money?action=wallet_connect&payload=${encodedPayload}`;
  const encodedInnerLink = encodeURIComponent(innerLink);
  
  return `https://terrastation.page.link/?link=${encodedInnerLink}&apn=money.terra.station&ibi=money.terra.station&isi=1548434735`;
}

/**
 * Create a QR code modal for WalletConnect
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
      modalElement.id = 'terrastation-qr-modal';
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
      title.textContent = 'Connect TerraStation';
      title.style.cssText = `
        color: #ffd700;
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
      `;
      content.appendChild(title);

      // Instructions
      const instructions = document.createElement('p');
      instructions.textContent = 'Scan this QR code with TerraStation app';
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

      // Generate QR code - uri is already the full Firebase Dynamic Link
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
 * Connect to TerraStation via WalletConnect
 */
export async function connectTerraStation(): Promise<{ address: string }> {
  // Clear any stale sessions first
  localStorage.removeItem(SESSION_STORAGE_KEY);
  
  // Create QR code modal
  const qrModal = createQRCodeModal();

  // Create WalletConnect instance with Terra bridge
  const wc = new WalletConnect({
    bridge: TERRA_BRIDGE,
    clientMeta: {
      name: 'USTC Preregister',
      description: 'CMM USTC Preregister DApp',
      url: window.location.origin,
      icons: [`${window.location.origin}/logo-bg-transparent.svg`],
    },
  });

  console.log('[TerraStation] Created WalletConnect instance');

  // Handle disconnect
  wc.on('disconnect', () => {
    console.log('[TerraStation] Disconnect event');
    localStorage.removeItem(SESSION_STORAGE_KEY);
    wcInstance = null;
    connectedAddress = null;
  });

  // Kill existing session if any
  if (wc.connected) {
    console.log('[TerraStation] Killing existing session');
    await wc.killSession();
  }

  // Create new session
  console.log('[TerraStation] Creating session...');
  await wc.createSession();
  console.log('[TerraStation] Session created, URI:', wc.uri);
  
  // Create the Firebase Dynamic Link for TerraStation
  const terraStationDeepLink = createTerraStationDeepLink(wc.uri);
  console.log('[TerraStation] Deep link for QR:', terraStationDeepLink);
  qrModal.open(terraStationDeepLink, () => {});

  // Wait for connection
  return new Promise((resolve, reject) => {
    let isResolved = false;

    const handleSuccess = () => {
      if (isResolved) return;
      
      console.log('[TerraStation] Connection successful, accounts:', wc.accounts);
      
      if (wc.accounts.length === 0) {
        console.error('[TerraStation] No accounts in session');
        reject(new Error('No accounts returned from TerraStation'));
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

    // Main connect event
    wc.on('connect', (error, payload) => {
      console.log('[TerraStation] Connect event received:', { error, payload, connected: wc.connected, accounts: wc.accounts });
      
      if (error) {
        console.error('[TerraStation] Connect error:', error);
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
      console.log('[TerraStation] Session update event:', { error, payload, connected: wc.connected, accounts: wc.accounts });
      
      if (!error && wc.connected && wc.accounts.length > 0) {
        handleSuccess();
      }
    });

    // Handle session rejection
    wc.on('disconnect', () => {
      console.log('[TerraStation] Disconnect event received');
      if (isResolved) return;
      isResolved = true;
      qrModal.close();
      reject(new Error('Connection rejected'));
    });

    // Poll for connection (fallback)
    const checkConnection = setInterval(() => {
      if (isResolved) {
        clearInterval(checkConnection);
        return;
      }
      
      if (wc.connected && wc.accounts.length > 0) {
        console.log('[TerraStation] Connection detected via polling');
        clearInterval(checkConnection);
        handleSuccess();
      }
      
      // Also check if session exists with accounts
      if (wc.session && wc.session.accounts && wc.session.accounts.length > 0) {
        console.log('[TerraStation] Session with accounts detected via polling');
        clearInterval(checkConnection);
        connectedAddress = wc.session.accounts[0];
        wcInstance = wc;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(wc.session));
        if (!isResolved) {
          isResolved = true;
          qrModal.close();
          resolve({ address: wc.session.accounts[0] });
        }
      }
    }, 500);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(checkConnection);
      if (!isResolved) {
        console.log('[TerraStation] Connection timeout');
        isResolved = true;
        qrModal.close();
        reject(new Error('Connection timeout'));
      }
    }, 120000);
  });
}

/**
 * Disconnect from TerraStation
 */
export async function disconnectTerraStation(): Promise<void> {
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
export function getTerraStationAddress(): string | null {
  return connectedAddress;
}

/**
 * Check if TerraStation is connected
 */
export function isTerraStationConnected(): boolean {
  return wcInstance !== null && wcInstance.connected && connectedAddress !== null;
}

/**
 * Restore session from storage if available
 */
export async function restoreTerraStationSession(): Promise<{ address: string } | null> {
  const cachedSession = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!cachedSession) {
    return null;
  }

  try {
    const session = JSON.parse(cachedSession) as IWalletConnectSession;

    const wc = new WalletConnect({
      bridge: TERRA_BRIDGE,
      session,
    });

    if (wc.connected && wc.accounts.length > 0) {
      wcInstance = wc;
      connectedAddress = wc.accounts[0];

      wc.on('disconnect', () => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        wcInstance = null;
        connectedAddress = null;
      });

      return { address: wc.accounts[0] };
    }
  } catch (err) {
    console.error('Failed to restore TerraStation session:', err);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return null;
}

