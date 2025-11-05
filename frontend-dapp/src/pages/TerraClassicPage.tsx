import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useWithdrawalInfo } from '@/hooks/useWithdrawalInfo';
import { useTerraClassicContract } from '@/hooks/useTerraClassicContract';
import { useTerraClassicWallet } from '@/hooks/useTerraClassicWallet';
import { getUSTCBalance } from '@/services/terraclassic/balance';
import { useToast } from '@/contexts/ToastContext';
import { validateAmount } from '@/utils/validation';
import { formatTimeRemaining, formatAddress } from '@/utils/format';
import { WalletName, WalletType } from '@goblinhunt/cosmes/wallet';

export const TerraClassicPage: React.FC = () => {
  const { address, isConnected, isConnecting, connect, disconnect, error: walletError, isStationAvailable, isKeplrAvailable } = useTerraClassicWallet();
  const { contract, totalDeposits, userCount, userDeposit, isLoading: isLoadingStats, deposit, withdraw, isDepositing, isWithdrawing, isOwner, isLoadingOwner, setWithdrawalDestination, isSettingWithdrawal, ownerWithdraw, isOwnerWithdrawing } = useTerraClassicContract(address);
  const { withdrawalInfo, timeRemaining, isUnlocked, isLoading: isLoadingWithdrawal } = useWithdrawalInfo('terraclassic', contract);
  const { showToast } = useToast();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  // Owner-only state
  const [withdrawalDestination, setWithdrawalDestinationInput] = useState('');
  const [unlockDays, setUnlockDays] = useState('7');

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
    } catch (err: any) {
      showToast(`Deposit failed: ${err.message}`, 'error');
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
    } catch (err: any) {
      showToast(`Withdraw failed: ${err.message}`, 'error');
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
      const unlockTimestamp = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
      showToast('Setting withdrawal destination...', 'info');
      await setWithdrawalDestination({ destination: withdrawalDestination, unlockTimestamp });
      setWithdrawalDestinationInput('');
      setUnlockDays('7');
      showToast('Withdrawal destination set successfully!', 'success');
    } catch (err: any) {
      showToast(`Failed to set withdrawal destination: ${err.message}`, 'error');
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
    } catch (err: any) {
      showToast(`Owner withdrawal failed: ${err.message}`, 'error');
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
                    No Terra Classic wallet detected. Please install:
                  </p>
                  <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '1.5rem' }}>
                    <li><a href="https://station.terra.money" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-primary)' }}>Station Wallet</a></li>
                    <li><a href="https://www.keplr.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-primary)' }}>Keplr Wallet</a></li>
                  </ul>
                </div>
              )}
              {(isStationAvailable || isKeplrAvailable) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {isStationAvailable && (
                    <Button
                      onClick={() => connect(WalletName.STATION, WalletType.EXTENSION)}
                      loading={isConnecting}
                      variant="primary"
                      style={{ width: '100%' }}
                    >
                      Connect Station Wallet
                    </Button>
                  )}
                  {isKeplrAvailable && (
                    <Button
                      onClick={() => connect(WalletName.KEPLR, WalletType.EXTENSION)}
                      loading={isConnecting}
                      variant="primary"
                      style={{ width: '100%' }}
                    >
                      Connect Keplr Wallet
                    </Button>
                  )}
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
              <Input
                label="Amount (USTC)"
                type="text"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                showMaxButton={true}
                onMaxClick={handleMaxDeposit}
                maxButtonDisabled={parseFloat(tokenBalance) === 0}
              />
              {loadingBalance ? (
                <LoadingSpinner size="sm" />
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Balance: {tokenBalance} USTC
                </p>
              )}
              <Button onClick={handleDeposit} loading={isDepositing} disabled={!depositAmount}>
                Deposit
              </Button>
            </div>
          </Card>

          {/* Withdraw Card */}
          <Card>
            <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Withdraw</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                maxButtonDisabled={parseFloat(userDeposit) === 0}
              />
              <Button onClick={handleWithdraw} loading={isWithdrawing} disabled={!withdrawAmount}>
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



