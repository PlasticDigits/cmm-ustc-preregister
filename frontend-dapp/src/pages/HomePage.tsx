import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Image } from '@/components/common/Image';
import { FaWallet } from 'react-icons/fa';
import { SiBinance } from 'react-icons/si';
import { motion } from 'framer-motion';
import TerraLogo from '../assets/icons/lunc.png';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

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
            src="/USTC.png"
            alt="USTC Logo"
            width={80}
            height={80}
            style={{ borderRadius: '50%' }}
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
          marginBottom: '3rem',
        }}>
          Deposit and manage your USTC tokens on Binance Smart Chain or Terra Classic
        </p>
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

