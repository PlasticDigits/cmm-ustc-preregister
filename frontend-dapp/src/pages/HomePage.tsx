import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Image } from '@/components/common/Image';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { FaWallet, FaExternalLinkAlt, FaRocket, FaClock } from 'react-icons/fa';
import { SiBinance } from 'react-icons/si';
import { motion } from 'framer-motion';
import TerraLogo from '../assets/icons/lunc.png';
import { useLaunchCountdown } from '@/hooks/useLaunchCountdown';
import { formatAddress } from '@/utils/format';
import { TERRA_EXPLORER_URL } from '@/utils/constants';

// Parse seconds into time units
const parseTimeUnits = (seconds: number | null) => {
  if (seconds === null || seconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, secs: 0 };
  }
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    secs: seconds % 60,
  };
};

// Single countdown unit box component
const CountdownUnit: React.FC<{ value: number; label: string; accentColor: string }> = ({ value, label, accentColor }) => (
  <motion.div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
    }}
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div style={{
      background: `linear-gradient(145deg, rgba(20, 20, 30, 0.9), rgba(30, 30, 45, 0.8))`,
      border: `1px solid ${accentColor}40`,
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      minWidth: '70px',
      boxShadow: `0 4px 20px ${accentColor}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
      }} />
      <span style={{
        fontSize: '2rem',
        fontWeight: 700,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        color: accentColor,
        textShadow: `0 0 20px ${accentColor}50`,
        display: 'block',
        lineHeight: 1,
      }}>
        {String(value).padStart(2, '0')}
      </span>
    </div>
    <span style={{
      fontSize: '0.7rem',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      fontWeight: 500,
    }}>
      {label}
    </span>
  </motion.div>
);

// Separator between countdown units
const CountdownSeparator: React.FC<{ accentColor: string }> = ({ accentColor }) => (
  <motion.span
    style={{
      fontSize: '1.5rem',
      fontWeight: 700,
      color: accentColor,
      opacity: 0.6,
      marginTop: '-0.5rem',
    }}
    animate={{ opacity: [0.3, 0.8, 0.3] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
  >
    :
  </motion.span>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { phase, timeRemaining, isLaunched, destinationAddress, isConfigured, isLoading } = useLaunchCountdown();

  // Determine countdown content based on phase
  const getCountdownContent = () => {
    switch (phase) {
      case 'preregistration':
        return {
          title: 'Preregistration Closes In',
          subtitle: 'Register your USTC before time runs out',
        };
      case 'launch':
        return {
          title: 'USTR Launches In',
          subtitle: 'Preregistration is now closed',
        };
      case 'launched':
        return {
          title: 'USTR Has Launched',
          subtitle: 'The wait is over!',
        };
      default:
        return {
          title: 'Countdown',
          subtitle: '',
        };
    }
  };

  const countdownContent = getCountdownContent();
  const timeUnits = parseTimeUnits(timeRemaining);
  const accentColor = phase === 'launch' ? 'var(--cyan-primary)' : 'var(--gold-primary)';

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
        style={{ width: '100%', maxWidth: '650px', marginBottom: '1rem' }}
      >
        <Card style={{
          textAlign: 'center',
          background: 'linear-gradient(160deg, rgba(15, 15, 25, 0.95) 0%, rgba(25, 25, 40, 0.9) 100%)',
          border: `1px solid ${accentColor}30`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px ${accentColor}08`,
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle glow effect */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle at 50% 50%, ${accentColor}05 0%, transparent 50%)`,
            pointerEvents: 'none',
          }} />
          
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1.5rem',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon 
                  icon={isLaunched ? FaRocket : FaClock} 
                  size={22} 
                  color={accentColor} 
                />
              </motion.div>
              <h2 style={{ 
                fontSize: '1.4rem', 
                margin: 0,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}>
                {countdownContent.title}
              </h2>
            </div>
            {countdownContent.subtitle && (
              <p style={{ 
                color: 'var(--text-muted)', 
                fontSize: '0.85rem', 
                margin: 0,
                opacity: 0.8,
              }}>
                {countdownContent.subtitle}
              </p>
            )}
          </div>
          
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <LoadingSpinner size="sm" />
            </div>
          ) : isConfigured ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {isLaunched ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                    borderRadius: '16px',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ fontSize: '2rem' }}
                  >
                    🚀
                  </motion.span>
                  <span style={{ 
                    color: 'var(--success)', 
                    fontSize: '1.3rem', 
                    fontWeight: 600,
                  }}>
                    USTR is Live!
                  </span>
                </motion.div>
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}>
                  <CountdownUnit value={timeUnits.days} label="Days" accentColor={accentColor} />
                  <CountdownSeparator accentColor={accentColor} />
                  <CountdownUnit value={timeUnits.hours} label="Hours" accentColor={accentColor} />
                  <CountdownSeparator accentColor={accentColor} />
                  <CountdownUnit value={timeUnits.minutes} label="Minutes" accentColor={accentColor} />
                  <CountdownSeparator accentColor={accentColor} />
                  <CountdownUnit value={timeUnits.secs} label="Seconds" accentColor={accentColor} />
                </div>
              )}
              
              {destinationAddress && (
                <div style={{ 
                  marginTop: '0.5rem',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                  <p style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '0.8rem', 
                    marginBottom: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
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
                      fontSize: '0.9rem',
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                      textDecoration: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 215, 0, 0.08)',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)';
                    }}
                  >
                    {formatAddress(destinationAddress, 10, 8)}
                    <FaExternalLinkAlt size={11} />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              opacity: 0.7,
            }}>
              <Icon icon={FaClock} size={32} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>Launch date not yet configured</p>
            </div>
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

