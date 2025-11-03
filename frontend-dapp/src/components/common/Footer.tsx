import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid rgba(255, 215, 0, 0.1)',
      padding: '2rem',
      textAlign: 'center',
      color: 'var(--text-muted)',
      marginTop: 'auto',
    }}>
      <p style={{ margin: '0.5rem 0' }}>
        USTC Preregistration Swap App
      </p>
      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
        Deposit and manage your USTC on Binance Smart Chain and Terra Classic
      </p>
    </footer>
  );
};



