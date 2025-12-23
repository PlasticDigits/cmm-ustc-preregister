import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Image } from '@/components/common/Image';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { FaWallet, FaExternalLinkAlt, FaRocket } from 'react-icons/fa';
import { SiBinance } from 'react-icons/si';
import { motion } from 'framer-motion';
import TerraLogo from '../assets/icons/lunc.png';
import { useLaunchCountdown } from '@/hooks/useLaunchCountdown';
import { formatTimeRemaining, formatAddress } from '@/utils/format';
import { TERRA_EXPLORER_URL } from '@/utils/constants';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { phase, timeRemaining, isLaunched, destinationAddress, isConfigured, isLoading } = useLaunchCountdown();

  // Determine countdown title based on phase
  const getCountdownTitle = () => {
    switch (phase) {
      case 'preregistration':
        return 'COUNTDOWN TO PREREGISTRATION CLOSED';
      case 'launch':
        return 'USTR LAUNCH COUNTDOWN';
      case 'launched':
        return 'USTR LAUNCH';
      default:
        return 'COUNTDOWN';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      gap: '2rem',
    }}>
      <motion.div 
        style={{ textAlign: 'center', maxWidth: '800px' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Image
            src="/logo-bg-transparent.svg"
            alt="USTC Preregister Logo"
            width={120}
            height={120}
          />
        </div>
        <h1 className="gradient-text" style={{
          fontSize: '3rem',
          marginBottom: '1rem',
          fontWeight: 700,
        }}>
          USTC Preregister
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--text-secondary)',
          marginBottom: '2rem',
        }}>
          Deposit and manage your USTC tokens on Binance Smart Chain or Terra Classic
        </p>
      </motion.div>

      {/* USTR Launch Countdown */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{ width: '100%', maxWidth: '600px', marginBottom: '1rem' }}
      >
        <Card style={{
          textAlign: 'center',
          background: phase === 'launch' 
            ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.12) 0%, rgba(255, 215, 0, 0.08) 100%)'
            : 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(0, 212, 255, 0.08) 100%)',
          border: phase === 'launch' 
            ? '1px solid rgba(0, 212, 255, 0.4)'
            : '1px solid rgba(255, 215, 0, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Icon icon={FaRocket} size={24} color={phase === 'launch' ? 'var(--cyan-primary)' : 'var(--gold-primary)'} />
            <h2 className={phase === 'launch' ? 'gradient-text-cyan' : 'gradient-text-gold'} style={{ fontSize: '1.5rem', margin: 0 }}>
              {getCountdownTitle()}
            </h2>
          </div>
          
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <LoadingSpinner size="sm" />
            </div>
          ) : isConfigured ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isLaunched ? (
                <div>
                  <p style={{ color: 'var(--success)', fontSize: '1.5rem', fontWeight: 700 }}>
                    🚀 USTR HAS LAUNCHED!
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ 
                    color: phase === 'launch' ? 'var(--gold-primary)' : 'var(--cyan-primary)', 
                    fontSize: '2rem', 
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    letterSpacing: '0.1em',
                  }}>
                    {formatTimeRemaining(timeRemaining)}
                  </p>
                  {phase === 'launch' && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      Preregistration is now closed
                    </p>
                  )}
                </div>
              )}
              
              {destinationAddress && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    Destination Address
                  </p>
                  <a
                    href={`${TERRA_EXPLORER_URL}/address/${destinationAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--gold-primary)',
                      fontSize: '0.95rem',
                      fontFamily: 'monospace',
                      textDecoration: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 215, 0, 0.1)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)';
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {formatAddress(destinationAddress, 10, 8)}
                    <FaExternalLinkAlt size={12} />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
              Launch date not yet configured
            </p>
          )}
        </Card>
      </motion.div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        width: '100%',
        maxWidth: '900px',
      }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="network-card gradient-bg-multi" style={{
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'center',
          }}
          onMouseEnter={(e: any) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-gold)';
          }}
          onMouseLeave={(e: any) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
          }}
          onClick={() => navigate('/bsc')}
          >
            <Icon 
              icon={SiBinance} 
              size={48} 
              color="var(--gold-primary)" 
              withGlow
              className="icon-wrapper"
              style={{ marginBottom: '1rem' }}
            />
            <h2 className="gradient-text-gold" style={{ marginBottom: '1rem' }}>Binance Smart Chain</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Deposit USTC-cb tokens on BSC network
            </p>
            <Button variant="primary">
              <Icon icon={FaWallet} size={18} />
              Connect to BSC
            </Button>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="network-card gradient-bg-multi" style={{
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'center',
          }}
          onMouseEnter={(e: any) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-gold)';
          }}
          onMouseLeave={(e: any) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
          }}
          onClick={() => navigate('/terraclassic')}
          >
            <img 
              src={TerraLogo} 
              height={48}
              width={48}
              style={{ marginBottom: '1rem', display: 'inline-block' }}
            />
            <h2 className="gradient-text-cyan" style={{ marginBottom: '1rem' }}>Terra Classic</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Deposit native USTC tokens on Terra Classic
            </p>
            <Button variant="primary">
              <Icon icon={FaWallet} size={18} />
              Connect to Terra
            </Button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

