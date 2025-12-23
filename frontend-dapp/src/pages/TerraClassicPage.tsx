import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useWithdrawalInfo } from '@/hooks/useWithdrawalInfo';
import { useLaunchCountdown } from '@/hooks/useLaunchCountdown';
import { useTerraClassicContract } from '@/hooks/useTerraClassicContract';
import { useTerraClassicWallet } from '@/hooks/useTerraClassicWallet';
import { getUSTCBalance } from '@/services/terraclassic/balance';
import { useToast } from '@/contexts/ToastContext';
import { validateAmount } from '@/utils/validation';
import { formatTimeRemaining, formatAddress } from '@/utils/format';
import { WalletName, WalletType } from '@goblinhunt/cosmes/wallet';

// Wallet images
import luncdashImg from '/wallet-images/luncdash.png';
import keplrImg from '/wallet-images/keplr.png';
import terrastationImg from '/wallet-images/terrastation.png';
import galaxystationImg from '/wallet-images/galaxystation.png';
import leapImg from '/wallet-images/leap.png';
import cosmostationImg from '/wallet-images/cosmostation.png';
import walletconnectImg from '/wallet-images/walletconnect.png';

// Helper component for mobile wallet buttons
const MobileWalletButtonContent: React.FC<{ walletImage: string; walletName: string }> = ({ walletImage, walletName }) => {
  const walletImageSize = 32; // Main wallet image size
  const walletconnectSize = (walletImageSize / 5) * 2; // Double the size (2/5 the size of main image)
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', justifyContent: 'flex-start', width: '100%' }}>
      <img 
        src={walletconnectImg} 
        alt="WalletConnect"
        style={{ height: `${walletconnectSize}px`, width: 'auto', objectFit: 'contain', marginRight: '0.25rem' }}
      />
      <img 
        src={walletImage} 
        alt={walletName}
        style={{ height: `${walletImageSize}px`, width: 'auto', objectFit: 'contain' }}
      />
      <span>{walletName}</span>
    </div>
  );
};

export const TerraClassicPage: React.FC = () => {
  const { address, isConnected, isConnecting, isConnectingStation, isConnectingKeplr, isConnectingWalletConnect, connect, disconnect, error: walletError, isStationAvailable, isKeplrAvailable } = useTerraClassicWallet();
  const { contract, totalDeposits, userCount, userDeposit, isLoading: isLoadingStats, deposit, withdraw, isDepositing, isWithdrawing, isOwner, isLoadingOwner, setWithdrawalDestination, isSettingWithdrawal, ownerWithdraw, isOwnerWithdrawing } = useTerraClassicContract(address);
  const { withdrawalInfo, timeRemaining, isUnlocked, isLoading: isLoadingWithdrawal } = useWithdrawalInfo('terraclassic', contract);
  const { isPreregistrationClosed } = useLaunchCountdown();
  const { showToast } = useToast();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showLuncDashModal, setShowLuncDashModal] = useState(false);
  const [showKeplrWCModal, setShowKeplrWCModal] = useState(false);
  const [showTerraStationModal, setShowTerraStationModal] = useState(false);
  const [showGalaxyModal, setShowGalaxyModal] = useState(false);
  const [showLeapModal, setShowLeapModal] = useState(false);
  const [showCosmostationModal, setShowCosmostationModal] = useState(false);
  const [isConnectingKeplrWC, setIsConnectingKeplrWC] = useState(false);
  const [isConnectingTerraStation, setIsConnectingTerraStation] = useState(false);
  const [isConnectingGalaxy, setIsConnectingGalaxy] = useState(false);
  const [isConnectingLeap, setIsConnectingLeap] = useState(false);
  const [isConnectingCosmostation, setIsConnectingCosmostation] = useState(false);
  
  // Owner-only state
  const [withdrawalDestination, setWithdrawalDestinationInput] = useState('');
  const [unlockDays, setUnlockDays] = useState('7');
  
  // Handle LuncDash WalletConnect connection
  const handleLuncDashClick = () => {
    setShowLuncDashModal(true);
  };
  
  const handleLuncDashConfirm = async () => {
    setShowLuncDashModal(false);
    try {
      // Disconnect existing connection if any
      if (isConnected) {
        await disconnect();
      }
      // Use LuncDash with WalletConnect (the primary Terra Classic mobile wallet)
      await connect(WalletName.LUNCDASH, WalletType.WALLETCONNECT);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`LuncDash connection failed: ${errorMessage}`, 'error');
    }
  };
  
  // Handle Keplr WalletConnect connection
  const handleKeplrWCClick = () => {
    setShowKeplrWCModal(true);
  };
  
  const handleKeplrWCConfirm = async () => {
    setShowKeplrWCModal(false);
    setIsConnectingKeplrWC(true);
    try {
      // Disconnect existing connection if any
      if (isConnected) {
        await disconnect();
      }
      // Use Keplr with WalletConnect v2
      await connect(WalletName.KEPLR, WalletType.WALLETCONNECT);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Keplr WalletConnect failed: ${errorMessage}`, 'error');
    } finally {
      setIsConnectingKeplrWC(false);
    }
  };
  
  // Handle TerraStation WalletConnect connection
  const handleTerraStationClick = () => {
    setShowTerraStationModal(true);
  };
  
  const handleTerraStationConfirm = async () => {
    setShowTerraStationModal(false);
    setIsConnectingTerraStation(true);
    try {
      // Disconnect existing connection if any
      if (isConnected) {
        await disconnect();
      }
      // Use Station with WalletConnect
      await connect(WalletName.STATION, WalletType.WALLETCONNECT);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`TerraStation WalletConnect failed: ${errorMessage}`, 'error');
    } finally {
      setIsConnectingTerraStation(false);
    }
  };
  
  // Handle Galaxy Wallet WalletConnect connection
  const handleGalaxyClick = () => {
    setShowGalaxyModal(true);
  };
  
  const handleGalaxyConfirm = async () => {
    setShowGalaxyModal(false);
    setIsConnectingGalaxy(true);
    try {
      // Disconnect existing connection if any
      if (isConnected) {
        await disconnect();
      }
      // Use Galaxy Station with WalletConnect v2
      await connect(WalletName.GALAXYSTATION, WalletType.WALLETCONNECT);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Galaxy Wallet connection failed: ${errorMessage}`, 'error');
    } finally {
      setIsConnectingGalaxy(false);
    }
  };
  
  // Handle Leap Wallet WalletConnect connection
  const handleLeapClick = () => {
    setShowLeapModal(true);
  };
  
  const handleLeapConfirm = async () => {
    setShowLeapModal(false);
    setIsConnectingLeap(true);
    try {
      // Disconnect existing connection if any
      if (isConnected) {
        await disconnect();
      }
      // Use Leap with WalletConnect v2
      await connect(WalletName.LEAP, WalletType.WALLETCONNECT);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Leap Wallet connection failed: ${errorMessage}`, 'error');
    } finally {
      setIsConnectingLeap(false);
    }
  };
  
  // Handle Cosmostation WalletConnect connection
  const handleCosmostationClick = () => {
    setShowCosmostationModal(true);
  };
  
  const handleCosmostationConfirm = async () => {
    setShowCosmostationModal(false);
    setIsConnectingCosmostation(true);
    try {
      // Disconnect existing connection if any
      if (isConnected) {
        await disconnect();
      }
      // Use Cosmostation with WalletConnect v2
      await connect(WalletName.COSMOSTATION, WalletType.WALLETCONNECT);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Cosmostation connection failed: ${errorMessage}`, 'error');
    } finally {
      setIsConnectingCosmostation(false);
    }
  };

  // Load token balance
  useEffect(() => {
    if (!isConnected || !address) {
      setTokenBalance('0');
      return;
    }

    const loadBalance = async () => {
      setLoadingBalance(true);
      try {
        const balance = await getUSTCBalance(address);
        setTokenBalance(balance);
      } catch (err) {
        console.error('Error loading balance:', err);
        setTokenBalance('0');
      } finally {
        setLoadingBalance(false);
      }
    };

    loadBalance();
    // Refresh balance every 10 seconds
    const interval = setInterval(loadBalance, 10000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  const handleDeposit = async () => {
    const validation = validateAmount(depositAmount);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid amount', 'error');
      return;
    }

    if (parseFloat(depositAmount) > parseFloat(tokenBalance)) {
      showToast('Insufficient balance', 'error');
      return;
    }

    try {
      showToast('Processing deposit...', 'info');
      await deposit(depositAmount);
      setDepositAmount('');
      showToast('Deposit successful!', 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Deposit failed: ${errorMessage}`, 'error');
    }
  };

  const handleWithdraw = async () => {
    const validation = validateAmount(withdrawAmount);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid amount', 'error');
      return;
    }

    if (parseFloat(withdrawAmount) > parseFloat(userDeposit)) {
      showToast('Insufficient deposit balance', 'error');
      return;
    }

    try {
      showToast('Processing withdrawal...', 'info');
      await withdraw(withdrawAmount);
      setWithdrawAmount('');
      showToast('Withdraw successful!', 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Withdraw failed: ${errorMessage}`, 'error');
    }
  };

  const handleMaxDeposit = () => {
    const maxAmount = parseFloat(tokenBalance);
    if (maxAmount > 0) {
      setDepositAmount(maxAmount.toString());
    }
  };

  const handleMaxWithdraw = () => {
    const maxAmount = parseFloat(userDeposit);
    if (maxAmount > 0) {
      setWithdrawAmount(maxAmount.toString());
    }
  };

  // Owner: Handle setting withdrawal destination
  const handleSetWithdrawalDestination = async () => {
    if (!withdrawalDestination || !unlockDays) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    // Validate address (Terra Classic addresses start with 'terra1')
    if (!withdrawalDestination.startsWith('terra1')) {
      showToast('Invalid Terra Classic address', 'error');
      return;
    }

    // Validate days (must be at least 7)
    const days = parseInt(unlockDays);
    if (isNaN(days) || days < 7) {
      showToast('Unlock time must be at least 7 days', 'error');
      return;
    }

    try {
      // Add 5 minute buffer to account for transaction processing time and block time differences
      const BUFFER_SECONDS = 5 * 60; // 5 minutes
      const unlockTimestamp = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60) + BUFFER_SECONDS;
      showToast('Setting withdrawal destination...', 'info');
      await setWithdrawalDestination({ destination: withdrawalDestination, unlockTimestamp });
      setWithdrawalDestinationInput('');
      setUnlockDays('7');
      showToast('Withdrawal destination set successfully!', 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to set withdrawal destination: ${errorMessage}`, 'error');
    }
  };

  // Owner: Handle owner withdraw
  const handleOwnerWithdraw = async () => {
    if (!withdrawalInfo?.isConfigured) {
      showToast('Withdrawal destination must be configured first', 'error');
      return;
    }

    if (!isUnlocked) {
      showToast('Withdrawal is not yet unlocked', 'error');
      return;
    }

    try {
      showToast('Processing owner withdrawal...', 'info');
      await ownerWithdraw();
      showToast('Owner withdrawal successful!', 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Owner withdrawal failed: ${errorMessage}`, 'error');
    }
  };


  // Handle connect from header button (no parameters)
  const handleHeaderConnect = () => {
    // Prefer Station, then Keplr
    if (isStationAvailable) {
      connect(WalletName.STATION, WalletType.EXTENSION);
    } else if (isKeplrAvailable) {
      connect(WalletName.KEPLR, WalletType.EXTENSION);
    } else {
      showToast('No wallet detected. Please install Station or Keplr wallet.', 'error');
    }
  };

  if (!isConnected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header network="Terra Classic" onConnect={handleHeaderConnect} />
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* Connect Wallet Card */}
            <Card>
              <h2 style={{ color: 'var(--gold-primary)', marginBottom: '2rem' }}>Connect Your Wallet</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Please connect your Terra Classic wallet (Station or Keplr) to interact with the contract.
              </p>
              {walletError && (
                <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {walletError}
                </p>
              )}
              {!isStationAvailable && !isKeplrAvailable && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255, 215, 0, 0.1)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    No browser wallet detected. You can:
                  </p>
                  <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '1.5rem' }}>
                    <li>Use a mobile wallet app (below)</li>
                    <li>Install <a href="https://station.terra.money" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-primary)' }}>Station Wallet</a></li>
                    <li>Install <a href="https://www.keplr.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-primary)' }}>Keplr Wallet</a></li>
                  </ul>
                </div>
              )}
              {(isStationAvailable || isKeplrAvailable) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {isStationAvailable && (
                    <Button
                      onClick={() => connect(WalletName.STATION, WalletType.EXTENSION)}
                      loading={isConnectingStation}
                      disabled={isConnecting}
                      variant="primary"
                      style={{ width: '100%' }}
                    >
                      Connect Station Wallet
                    </Button>
                  )}
                  {isKeplrAvailable && (
                    <Button
                      onClick={() => connect(WalletName.KEPLR, WalletType.EXTENSION)}
                      loading={isConnectingKeplr}
                      disabled={isConnecting}
                      variant="primary"
                      style={{ width: '100%' }}
                    >
                      Connect Keplr Wallet
                    </Button>
                  )}
                  <h3 style={{ color: 'var(--gold-primary)', fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '1rem' }}>
                    Mobile WalletConnect
                  </h3>
                  <Button
                    onClick={handleKeplrWCClick}
                    loading={isConnectingKeplrWC}
                    disabled={isConnecting || isConnectingWalletConnect || isConnectingTerraStation}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={keplrImg} walletName="Keplr" />
                  </Button>
                  <Button
                    onClick={handleLuncDashClick}
                    loading={isConnectingWalletConnect}
                    disabled={isConnecting || isConnectingKeplrWC}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={luncdashImg} walletName="LuncDash" />
                  </Button>
                  <Button
                    onClick={handleTerraStationClick}
                    loading={isConnectingTerraStation}
                    disabled={isConnecting || isConnectingWalletConnect || isConnectingKeplrWC || isConnectingGalaxy || isConnectingLeap}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={terrastationImg} walletName="TerraStation" />
                  </Button>
                  <Button
                    onClick={handleGalaxyClick}
                    loading={isConnectingGalaxy}
                    disabled={isConnecting || isConnectingWalletConnect || isConnectingKeplrWC || isConnectingTerraStation || isConnectingLeap}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={galaxystationImg} walletName="Galaxy" />
                  </Button>
                  <Button
                    onClick={handleLeapClick}
                    loading={isConnectingLeap}
                    disabled={isConnecting || isConnectingWalletConnect || isConnectingKeplrWC || isConnectingTerraStation || isConnectingGalaxy || isConnectingCosmostation}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={leapImg} walletName="Leap" />
                  </Button>
                  <Button
                    onClick={handleCosmostationClick}
                    loading={isConnectingCosmostation}
                    disabled={isConnecting || isConnectingWalletConnect || isConnectingKeplrWC || isConnectingTerraStation || isConnectingGalaxy || isConnectingLeap}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={cosmostationImg} walletName="Cosmostation" />
                  </Button>
                </div>
              )}
              {!isStationAvailable && !isKeplrAvailable && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ color: 'var(--gold-primary)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
                    Mobile WalletConnect
                  </h3>
                  <Button
                    onClick={handleKeplrWCClick}
                    loading={isConnectingKeplrWC}
                    disabled={isConnectingWalletConnect || isConnectingTerraStation || isConnectingGalaxy || isConnectingLeap || isConnectingCosmostation}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={keplrImg} walletName="Keplr" />
                  </Button>
                  <Button
                    onClick={handleLuncDashClick}
                    loading={isConnectingWalletConnect}
                    disabled={isConnectingKeplrWC || isConnectingTerraStation || isConnectingGalaxy || isConnectingLeap || isConnectingCosmostation}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={luncdashImg} walletName="LuncDash" />
                  </Button>
                  <Button
                    onClick={handleTerraStationClick}
                    loading={isConnectingTerraStation}
                    disabled={isConnectingWalletConnect || isConnectingKeplrWC || isConnectingGalaxy || isConnectingLeap || isConnectingCosmostation}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={terrastationImg} walletName="TerraStation" />
                  </Button>
                  <Button
                    onClick={handleGalaxyClick}
                    loading={isConnectingGalaxy}
                    disabled={isConnectingWalletConnect || isConnectingKeplrWC || isConnectingTerraStation || isConnectingLeap || isConnectingCosmostation}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={galaxystationImg} walletName="Galaxy" />
                  </Button>
                  <Button
                    onClick={handleLeapClick}
                    loading={isConnectingLeap}
                    disabled={isConnectingWalletConnect || isConnectingKeplrWC || isConnectingTerraStation || isConnectingGalaxy || isConnectingCosmostation}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={leapImg} walletName="Leap" />
                  </Button>
                  <Button
                    onClick={handleCosmostationClick}
                    loading={isConnectingCosmostation}
                    disabled={isConnectingWalletConnect || isConnectingKeplrWC || isConnectingTerraStation || isConnectingGalaxy || isConnectingLeap}
                    variant="secondary"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <MobileWalletButtonContent walletImage={cosmostationImg} walletName="Cosmostation" />
                  </Button>
                </div>
              )}
            </Card>

            {/* Stats Card - visible even without wallet */}
            <Card>
              <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Contract Statistics</h3>
              {isLoadingStats ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Deposits</p>
                    <p style={{ color: 'var(--cyan-primary)', fontSize: '1.5rem', fontWeight: 600 }}>
                      {totalDeposits} USTC
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Users</p>
                    <p style={{ color: 'var(--cyan-primary)', fontSize: '1.5rem', fontWeight: 600 }}>
                      {userCount}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Withdrawal Status Card */}
            <Card>
              <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Withdrawal Status</h3>
              {isLoadingWithdrawal ? (
                <LoadingSpinner size="sm" />
              ) : withdrawalInfo?.isConfigured ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Destination</p>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                      {withdrawalInfo.destination ? formatAddress(withdrawalInfo.destination, 8, 6) : 'Not set'}
                    </p>
                  </div>
                  {isUnlocked ? (
                    <div>
                      <p style={{ color: 'var(--success)', fontSize: '1rem', fontWeight: 600 }}>
                        ✅ Ready to withdraw
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Unlocks in</p>
                      <p style={{ color: 'var(--gold-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
                        {formatTimeRemaining(timeRemaining)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Withdrawal destination not yet configured
                </p>
              )}
            </Card>
          </div>
        </main>
        
        {/* Warning Modal - outside grid layout */}
        {/* LuncDash Modal */}
        <Modal
          isOpen={showLuncDashModal}
          onClose={() => setShowLuncDashModal(false)}
          title="📱 Connect with LuncDash"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                This will connect using the LuncDash mobile wallet via WalletConnect.
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Make sure you have the LuncDash app installed on your mobile device. A QR code will appear for you to scan.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Note: For desktop users, we recommend using browser extension wallets (Station/Keplr) for the best experience.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowLuncDashModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleLuncDashConfirm} variant="primary">
                Connect with LuncDash
              </Button>
            </div>
          </div>
        </Modal>
        
        {/* Keplr WalletConnect Modal */}
        <Modal
          isOpen={showKeplrWCModal}
          onClose={() => setShowKeplrWCModal(false)}
          title="📱 Connect with Keplr Mobile"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                This will connect using the Keplr mobile wallet via WalletConnect.
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Make sure you have the Keplr app installed on your mobile device. A QR code will appear for you to scan.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Note: For desktop users, we recommend using the Keplr browser extension for the best experience.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowKeplrWCModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleKeplrWCConfirm} variant="primary">
                Connect with Keplr
              </Button>
            </div>
          </div>
        </Modal>
        
        {/* TerraStation WalletConnect Modal */}
        <Modal
          isOpen={showTerraStationModal}
          onClose={() => setShowTerraStationModal(false)}
          title="📱 Connect with TerraStation Mobile"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                This will connect using the TerraStation mobile wallet via WalletConnect.
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Make sure you have the TerraStation app installed on your mobile device. A QR code will appear for you to scan.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Note: For desktop users, we recommend using the Station browser extension for the best experience.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowTerraStationModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleTerraStationConfirm} variant="primary">
                Connect with TerraStation
              </Button>
            </div>
          </div>
        </Modal>
        
        {/* Galaxy Wallet Modal */}
        <Modal
          isOpen={showGalaxyModal}
          onClose={() => setShowGalaxyModal(false)}
          title="📱 Connect with Galaxy Wallet"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                This will connect using the Galaxy Station mobile wallet via WalletConnect.
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Make sure you have the Galaxy Station app installed on your mobile device. A QR code will appear for you to scan.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowGalaxyModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleGalaxyConfirm} variant="primary">
                Connect with Galaxy
              </Button>
            </div>
          </div>
        </Modal>
        
        {/* Leap Wallet Modal */}
        <Modal
          isOpen={showLeapModal}
          onClose={() => setShowLeapModal(false)}
          title="📱 Connect with Leap Wallet"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                This will connect using the Leap mobile wallet via WalletConnect.
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Make sure you have the Leap app installed on your mobile device. A QR code will appear for you to scan.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowLeapModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleLeapConfirm} variant="primary">
                Connect with Leap
              </Button>
            </div>
          </div>
        </Modal>
        
        {/* Cosmostation Wallet Modal */}
        <Modal
          isOpen={showCosmostationModal}
          onClose={() => setShowCosmostationModal(false)}
          title="📱 Connect with Cosmostation"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                This will connect using the Cosmostation mobile wallet via WalletConnect.
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Make sure you have the Cosmostation app installed on your mobile device. A QR code will appear for you to scan.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowCosmostationModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleCosmostationConfirm} variant="primary">
                Connect with Cosmostation
              </Button>
            </div>
          </div>
        </Modal>
        
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header 
        network="Terra Classic" 
        walletAddress={address || undefined} 
        onDisconnect={disconnect}
        walletStatus={isLoadingOwner ? undefined : (isOwner ? 'owner' : 'public')}
      />
      
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Stats Card */}
          <Card>
            <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Contract Statistics</h3>
            {isLoadingStats ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Deposits</p>
                  <p style={{ color: 'var(--cyan-primary)', fontSize: '1.5rem', fontWeight: 600 }}>
                    {totalDeposits} USTC
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Users</p>
                  <p style={{ color: 'var(--cyan-primary)', fontSize: '1.5rem', fontWeight: 600 }}>
                    {userCount}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Withdrawal Status Card */}
          <Card>
            <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Withdrawal Status</h3>
            {isLoadingWithdrawal ? (
              <LoadingSpinner size="sm" />
            ) : withdrawalInfo?.isConfigured ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Destination</p>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    {withdrawalInfo.destination ? formatAddress(withdrawalInfo.destination, 8, 6) : 'Not set'}
                  </p>
                </div>
                {isUnlocked ? (
                  <div>
                    <p style={{ color: 'var(--success)', fontSize: '1rem', fontWeight: 600 }}>
                      ✅ Ready to withdraw
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Unlocks in</p>
                    <p style={{ color: 'var(--gold-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
                      {formatTimeRemaining(timeRemaining)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Withdrawal destination not yet configured
              </p>
            )}
          </Card>

          {/* Deposit Card */}
          <Card>
            <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Deposit</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isPreregistrationClosed && (
                <p style={{ color: 'var(--warning)', fontSize: '0.9rem', fontWeight: 600 }}>
                  ⏰ Preregistration is closed. Deposits are no longer accepted.
                </p>
              )}
              <Input
                label="Amount (USTC)"
                type="text"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                showMaxButton={true}
                onMaxClick={handleMaxDeposit}
                maxButtonDisabled={parseFloat(tokenBalance) === 0 || isPreregistrationClosed}
                disabled={isPreregistrationClosed}
              />
              {loadingBalance ? (
                <LoadingSpinner size="sm" />
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Balance: {tokenBalance} USTC
                </p>
              )}
              <Button onClick={handleDeposit} loading={isDepositing} disabled={!depositAmount || isPreregistrationClosed}>
                Deposit
              </Button>
            </div>
          </Card>

          {/* Withdraw Card */}
          <Card>
            <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Withdraw</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isPreregistrationClosed && (
                <p style={{ color: 'var(--warning)', fontSize: '0.9rem', fontWeight: 600 }}>
                  ⏰ Preregistration is closed. Withdrawals are no longer accepted.
                </p>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Your Deposit: {userDeposit} USTC
              </p>
              <Input
                label="Amount (USTC)"
                type="text"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                showMaxButton={true}
                onMaxClick={handleMaxWithdraw}
                maxButtonDisabled={parseFloat(userDeposit) === 0 || isPreregistrationClosed}
                disabled={isPreregistrationClosed}
              />
              <Button onClick={handleWithdraw} loading={isWithdrawing} disabled={!withdrawAmount || isPreregistrationClosed}>
                Withdraw
              </Button>
            </div>
          </Card>

          {/* Owner-only Cards */}
          {isOwner && (
            <>
              {/* Set Withdrawal Destination Card */}
              <Card>
                <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Set Withdrawal Destination</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input
                    label="Destination Address (terra1...)"
                    type="text"
                    value={withdrawalDestination}
                    onChange={(e) => setWithdrawalDestinationInput(e.target.value)}
                    placeholder="terra1..."
                  />
                  <Input
                    label="Unlock Time (days, min 7)"
                    type="number"
                    value={unlockDays}
                    onChange={(e) => setUnlockDays(e.target.value)}
                    placeholder="7"
                    min="7"
                  />
                  <Button 
                    onClick={handleSetWithdrawalDestination} 
                    loading={isSettingWithdrawal} 
                    disabled={!withdrawalDestination || !unlockDays || parseInt(unlockDays) < 7}
                  >
                    Set Withdrawal Destination
                  </Button>
                </div>
              </Card>

              {/* Owner Withdraw Card */}
              <Card>
                <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Owner Withdraw</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {withdrawalInfo?.isConfigured ? (
                    <>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Destination</p>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                          {withdrawalInfo.destination ? formatAddress(withdrawalInfo.destination, 8, 6) : 'Not set'}
                        </p>
                      </div>
                      {isUnlocked ? (
                        <div>
                          <p style={{ color: 'var(--success)', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                            ✅ Ready to withdraw
                          </p>
                          <Button 
                            onClick={handleOwnerWithdraw} 
                            loading={isOwnerWithdrawing}
                            variant="primary"
                          >
                            Withdraw All Tokens
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Unlocks in</p>
                          <p style={{ color: 'var(--gold-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
                            {formatTimeRemaining(timeRemaining)}
                          </p>
                          <Button 
                            onClick={handleOwnerWithdraw} 
                            loading={isOwnerWithdrawing}
                            disabled={true}
                            style={{ marginTop: '1rem' }}
                          >
                            Withdrawal Locked
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Please set withdrawal destination first
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};



