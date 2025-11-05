import React, { useState, useEffect } from 'react';
import { useBSCWallet } from '@/hooks/useBSCWallet';
import { useBSCContract } from '@/hooks/useBSCContract';
import { useWithdrawalInfo } from '@/hooks/useWithdrawalInfo';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';
import { validateAmount } from '@/utils/validation';
import { formatBalance, formatTimeRemaining, formatAddress } from '@/utils/format';
import { USTC_TOKEN_ADDRESS } from '@/utils/constants';
import { ethers } from 'ethers';

export const BSCPage: React.FC = () => {
  const { address, isConnected, isCorrectNetwork, connect, disconnect, isConnecting, signer } = useBSCWallet();
  const { contract, userDeposit, totalDeposits, userCount, deposit, withdraw, isDepositing, isWithdrawing } = useBSCContract(signer);
  const { withdrawalInfo, timeRemaining, isUnlocked, isLoading: isLoadingWithdrawal } = useWithdrawalInfo('bsc', contract);
  const { showToast } = useToast();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [allowance, setAllowance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Load token balance and allowance
  useEffect(() => {
    if (!isConnected || !address || !signer) return;

    const loadTokenData = async () => {
      setLoadingBalance(true);
      try {
        const provider = signer.provider;
        if (!provider) return;
        
        const erc20Abi = ['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'];
        const tokenContract = new ethers.Contract(USTC_TOKEN_ADDRESS, erc20Abi, provider);
        const balance = await tokenContract.balanceOf(address);
        const contractAddress = import.meta.env.VITE_BSC_CONTRACT_ADDRESS;
        if (contractAddress) {
          const allow = await tokenContract.allowance(address, contractAddress);
          setAllowance(formatBalance(allow));
        }
        setTokenBalance(formatBalance(balance));
      } catch (err) {
        console.error('Error loading token data:', err);
      } finally {
        setLoadingBalance(false);
      }
    };

    loadTokenData();
  }, [isConnected, address, signer]);

  const handleDeposit = async () => {
    const validation = validateAmount(depositAmount);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid amount', 'error');
      return;
    }

    if (!signer) return;

    try {
      // First check if approval is needed
      const provider = signer.provider;
      if (!provider) return;
      
      const erc20Abi = ['function approve(address,uint256) returns (bool)'];
      const tokenContract = new ethers.Contract(USTC_TOKEN_ADDRESS, erc20Abi, signer);
      const amountBN = ethers.parseUnits(depositAmount, 18);
      const contractAddress = import.meta.env.VITE_BSC_CONTRACT_ADDRESS;
      
      if (!contractAddress) {
        showToast('Contract address not configured', 'error');
        return;
      }
      
      // Check allowance
      const currentAllowance = await tokenContract.allowance(address, contractAddress);
      if (currentAllowance < amountBN) {
        showToast('Approving token spend...', 'info');
        const approveTx = await tokenContract.approve(contractAddress, amountBN);
        await approveTx.wait();
        showToast('Token approval successful!', 'success');
      }

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

  if (!isConnected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header onConnect={connect} />
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* Connect Wallet Card */}
            <Card>
              <h2 style={{ color: 'var(--gold-primary)', marginBottom: '2rem' }}>Connect Your Wallet</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Please connect your MetaMask wallet to interact with the BSC contract.
              </p>
              <Button onClick={connect} loading={isConnecting}>
                Connect Wallet
              </Button>
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
      <Header network="BSC" walletAddress={address || undefined} onDisconnect={disconnect} />
      
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
                  Balance: {tokenBalance} USTC | Allowance: {allowance} USTC
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
        </div>
      </main>

      <Footer />
    </div>
  );
};
