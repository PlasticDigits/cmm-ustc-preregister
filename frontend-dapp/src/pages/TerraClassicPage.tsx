import React from 'react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useWithdrawalInfo } from '@/hooks/useWithdrawalInfo';
import { formatTimeRemaining, formatAddress } from '@/utils/format';

export const TerraClassicPage: React.FC = () => {
  // TODO: Replace with actual Terra Classic contract instance when service is implemented
  const { withdrawalInfo, timeRemaining, isUnlocked, isLoading: isLoadingWithdrawal } = useWithdrawalInfo('terraclassic', null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header network="Terra Classic" />
      
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <Card>
            <h2 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Terra Classic</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Terra Classic integration coming soon. This page will support native USTC deposits on Terra Classic network.
            </p>
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
};



