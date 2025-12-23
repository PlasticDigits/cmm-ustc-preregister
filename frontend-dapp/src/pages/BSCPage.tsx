import React, { useState, useEffect } from 'react';
import { useBSCWallet } from '@/hooks/useBSCWallet';
import { useBSCWalletConnect } from '@/hooks/useBSCWalletConnect';
import { useBSCContract } from '@/hooks/useBSCContract';
import { useWithdrawalInfo } from '@/hooks/useWithdrawalInfo';
import { useLaunchCountdown } from '@/hooks/useLaunchCountdown';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/contexts/ToastContext';
import { validateAmount } from '@/utils/validation';
import { formatBalance, formatTimeRemaining, formatAddress } from '@/utils/format';
import { USTC_TOKEN_ADDRESS, BSC_CONTRACT_ADDRESS } from '@/utils/constants';
import { ethers } from 'ethers';

export const BSCPage: React.FC = () => {
  const { address: metamaskAddress, isConnected: isMetamaskConnected, isCorrectNetwork: isMetamaskCorrectNetwork, connect: connectMetamask, disconnect: disconnectMetamask, isConnecting: isMetamaskConnecting, signer: metamaskSigner, error: metamaskError } = useBSCWallet();
  const { address: wcAddress, isConnected: isWCConnected, isCorrectNetwork: isWCCorrectNetwork, connect: connectWC, disconnect: disconnectWC, isConnecting: isWCConnecting, signer: wcSigner, error: wcError } = useBSCWalletConnect();
  
  // Use the active connection (prioritize MetaMask if both connected)
  const address = metamaskAddress || wcAddress;
  const isConnected = isMetamaskConnected || isWCConnected;
  const isCorrectNetwork = isMetamaskCorrectNetwork || isWCCorrectNetwork;
  const signer = metamaskSigner || wcSigner;
  const error = metamaskError || wcError;
  
  const { contract, userDeposit, userDepositRaw, totalDeposits, userCount, deposit, withdraw, isDepositing, isWithdrawing, isOwner, isLoadingOwner, setWithdrawalDestination, isSettingWithdrawal, ownerWithdraw, isOwnerWithdrawing } = useBSCContract(signer);
  const { withdrawalInfo, timeRemaining, isUnlocked, isLoading: isLoadingWithdrawal } = useWithdrawalInfo('bsc', contract);
  const { isPreregistrationClosed } = useLaunchCountdown();
  const { showToast } = useToast();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [tokenBalanceRaw, setTokenBalanceRaw] = useState<bigint>(0n); // Store raw balance for precision
  const [allowance, setAllowance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  
  // Owner-only state
  const [withdrawalDestination, setWithdrawalDestinationInput] = useState('');
  const [unlockDays, setUnlockDays] = useState('7');
  
  // Handle disconnect - disconnect both if needed
  const disconnect = async () => {
    if (isMetamaskConnected) {
      await disconnectMetamask();
    }
    if (isWCConnected) {
      await disconnectWC();
    }
  };
  
  // Handle WalletConnect connection with warning modal
  const handleWalletConnectClick = () => {
    setShowWarningModal(true);
  };
  
  const handleWalletConnectConfirm = async () => {
    setShowWarningModal(false);
    try {
      // Disconnect MetaMask if connected
      if (isMetamaskConnected) {
        await disconnectMetamask();
      }
      await connectWC();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`WalletConnect connection failed: ${errorMessage}`, 'error');
    }
  };
  
  // Handle MetaMask connection - disconnect WalletConnect if connected
  const handleMetamaskConnect = async () => {
    try {
      // Disconnect WalletConnect if connected
      if (isWCConnected) {
        await disconnectWC();
      }
      await connectMetamask();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`MetaMask connection failed: ${errorMessage}`, 'error');
    }
  };

  // Helper function to reload token balance and allowance
  const reloadTokenData = async () => {
    if (!signer || !address) return;
    
    try {
      const provider = signer.provider;
      if (!provider) return;
      
      const erc20Abi = [
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address,address) view returns (uint256)'
      ];
      const tokenContract = new ethers.Contract(USTC_TOKEN_ADDRESS, erc20Abi, provider);
      const [balance, allow] = await Promise.all([
        tokenContract.balanceOf(address),
        BSC_CONTRACT_ADDRESS ? tokenContract.allowance(address, BSC_CONTRACT_ADDRESS) : Promise.resolve(0)
      ]);
      setTokenBalanceRaw(balance);
      setTokenBalance(formatBalance(balance));
      if (BSC_CONTRACT_ADDRESS) {
        setAllowance(formatBalance(allow));
      }
    } catch (err) {
      console.error('Error reloading token data:', err);
    }
  };

  // Load token balance and allowance
  useEffect(() => {
    if (!isConnected || !address || !signer) return;

    const loadTokenData = async () => {
      setLoadingBalance(true);
      try {
        await reloadTokenData();
      } catch (err) {
        console.error('Error loading token data:', err);
      } finally {
        setLoadingBalance(false);
      }
    };

    loadTokenData();
  }, [isConnected, address, signer]);

  const handleApprove = async () => {
    const validation = validateAmount(depositAmount);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid amount', 'error');
      return;
    }

    if (!signer || !address) return;

    try {
      const provider = signer.provider;
      if (!provider) return;
      
      const erc20Abi = [
        'function approve(address,uint256) returns (bool)',
        'function allowance(address,address) view returns (uint256)'
      ];
      const tokenContract = new ethers.Contract(USTC_TOKEN_ADDRESS, erc20Abi, signer);
      const amountBN = ethers.parseUnits(depositAmount, 18);
      
      if (!BSC_CONTRACT_ADDRESS) {
        showToast('Contract address not configured', 'error');
        return;
      }
      
      setIsApproving(true);
      showToast('Approving token spend...', 'info');
      const approveTx = await tokenContract.approve(BSC_CONTRACT_ADDRESS, amountBN);
      await approveTx.wait();
      showToast('Token approval successful!', 'success');
      
      // Reload token balance and allowance
      await reloadTokenData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Approval failed: ${errorMessage}`, 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    const validation = validateAmount(depositAmount);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid amount', 'error');
      return;
    }

    if (!signer || !address) return;

    try {
      showToast('Processing deposit...', 'info');
      // await the async mutation which waits for transaction confirmation
      await deposit(depositAmount);
      setDepositAmount('');
      showToast('Deposit successful!', 'success');
      
      // Reload token balance and allowance after deposit
      // Contract queries (userDeposit, totalDeposits, userCount) are automatically refetched by the mutation
      await reloadTokenData();
    } catch (err: unknown) {
      // Only show error if it's not a user rejection
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (!errorMessage.includes('user rejected') && !errorMessage.includes('User denied')) {
        showToast(`Deposit failed: ${errorMessage}`, 'error');
      }
    }
  };

  const handleWithdraw = async () => {
    const validation = validateAmount(withdrawAmount);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid amount', 'error');
      return;
    }

    try {
      showToast('Processing withdrawal...', 'info');
      await withdraw(withdrawAmount);
      setWithdrawAmount('');
      showToast('Withdraw successful!', 'success');
      
      // Reload token balance and allowance after withdraw
      // Contract queries (userDeposit, totalDeposits, userCount) are automatically refetched by the mutation
      await reloadTokenData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Withdraw failed: ${errorMessage}`, 'error');
    }
  };

  const handleMaxDeposit = () => {
    // Use the raw balance converted to string with full precision
    // This avoids rounding errors from formatBalance
    if (tokenBalanceRaw > 0n) {
      // Convert raw balance to string with full 18 decimal precision
      const maxAmount = ethers.formatUnits(tokenBalanceRaw, 18);
      // Remove trailing zeros but keep full precision
      setDepositAmount(maxAmount.replace(/\.?0+$/, ''));
    }
  };

  const handleMaxWithdraw = () => {
    // Use the raw deposit converted to string with full precision
    // This avoids any potential precision issues from formatting
    if (userDepositRaw > 0n) {
      // Convert raw deposit to string with full 18 decimal precision
      const maxAmount = ethers.formatUnits(userDepositRaw, 18);
      // Remove trailing zeros but keep full precision
      setWithdrawAmount(maxAmount.replace(/\.?0+$/, ''));
    }
  };

  // Check if approval is needed
  const needsApproval = () => {
    const depositAmt = parseFloat(depositAmount);
    const allowAmt = parseFloat(allowance);
    return !isNaN(depositAmt) && !isNaN(allowAmt) && depositAmt > allowAmt;
  };

  // Owner: Handle setting withdrawal destination
  const handleSetWithdrawalDestination = async () => {
    if (!withdrawalDestination || !unlockDays) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    // Validate address
    if (!ethers.isAddress(withdrawalDestination)) {
      showToast('Invalid destination address', 'error');
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

  if (!isConnected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header onConnect={handleMetamaskConnect} />
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* Connect Wallet Card */}
            <Card>
              <h2 style={{ color: 'var(--gold-primary)', marginBottom: '2rem' }}>Connect Your Wallet</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Please connect your wallet to interact with the BSC contract. We recommend using MetaMask browser extension.
              </p>
              {error && (
                <div style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--error)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--error)',
                  fontSize: '0.9rem',
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Button onClick={handleMetamaskConnect} loading={isMetamaskConnecting}>
                  Connect Wallet (MetaMask)
                </Button>
                <Button onClick={handleWalletConnectClick} loading={isWCConnecting} variant="secondary">
                  WalletConnect
                </Button>
              </div>
            </Card>

            {/* Stats Card - visible even without wallet */}
            <Card>
              <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Contract Statistics</h3>
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
        <Modal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          title="⚠️ Privacy Warning"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                WalletConnect should be used as a last resort. It is run by Reown, which has:
              </p>
              <ul style={{ color: 'var(--text-secondary)', marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Poor respect for user privacy</li>
                <li>Is not open source</li>
              </ul>
              <p style={{ color: 'var(--text-secondary)' }}>
                We recommend using browser extension wallets (MetaMask for BSC) whenever possible.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowWarningModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleWalletConnectConfirm} variant="primary">
                Continue with WalletConnect
              </Button>
            </div>
          </div>
        </Modal>
        
        <Footer />
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header network="Wrong Network" walletAddress={address || undefined} onDisconnect={disconnect} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card>
            <h2 style={{ color: 'var(--warning)', marginBottom: '2rem' }}>Wrong Network</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Please switch to Binance Smart Chain network.
            </p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header 
        network="BSC" 
        walletAddress={address || undefined} 
        onDisconnect={disconnect}
        walletStatus={isLoadingOwner ? undefined : (isOwner ? 'owner' : 'public')}
        onConnect={handleMetamaskConnect}
      />
      
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Stats Card */}
          <Card>
            <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Contract Statistics</h3>
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
                  Balance: {tokenBalance} USTC | Allowance: {allowance} USTC
                </p>
              )}
              <Button 
                onClick={needsApproval() ? handleApprove : handleDeposit} 
                loading={isApproving || isDepositing} 
                disabled={!depositAmount || isPreregistrationClosed}
              >
                {needsApproval() ? 'Approve' : 'Deposit'}
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
                    label="Destination Address"
                    type="text"
                    value={withdrawalDestination}
                    onChange={(e) => setWithdrawalDestinationInput(e.target.value)}
                    placeholder="0x..."
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
