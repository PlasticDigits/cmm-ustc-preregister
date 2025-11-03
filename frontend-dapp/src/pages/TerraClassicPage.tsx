import React from 'react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Card } from '@/components/common/Card';

export const TerraClassicPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header network="Terra Classic" />
      
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Card>
          <h2 style={{ color: 'var(--gold-primary)', marginBottom: '1rem' }}>Terra Classic</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Terra Classic integration coming soon. This page will support native USTC deposits on Terra Classic network.
          </p>
        </Card>
      </main>

      <Footer />
    </div>
  );
};



