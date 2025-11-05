import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from './Badge';
import { Button } from './Button';
import { Icon } from './Icon';
import { FaCopy, FaCheck } from 'react-icons/fa';
import { useToast } from '@/contexts/ToastContext';

interface HeaderProps {
  network?: string;
  walletAddress?: string;
  walletStatus?: 'owner' | 'public';
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  network,
  walletAddress,
  walletStatus,
  onConnect,
  onDisconnect,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      showToast('Wallet address copied to clipboard!', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy address', 'error');
    }
  };

  return (
    <header style={{
      background: 'rgba(10, 10, 10, 0.95)',
      borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexWrap: 'wrap',
      gap: '1rem',
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ color: 'var(--gold-primary)', margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 700 }}>USTC Preregister</h1>
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {network && (
          <Badge variant="secondary" size="md">
            {network}
          </Badge>
        )}
        
        {walletStatus && (
          <Badge variant={walletStatus === 'owner' ? 'primary' : 'info'} size="md">
            {walletStatus === 'owner' ? 'Owner' : 'Public'}
          </Badge>
        )}
        
        {walletAddress ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopyAddress}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--gold-primary)',
                color: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              <Icon icon={copied ? FaCheck : FaCopy} size={14} />
            </button>
            {onDisconnect && (
              <Button variant="secondary" size="sm" onClick={onDisconnect}>
                Disconnect
              </Button>
            )}
          </div>
        ) : (
          onConnect && (
            <Button variant="primary" size="md" onClick={onConnect}>
              Connect Wallet
            </Button>
          )
        )}
      </div>
    </header>
  );
};
