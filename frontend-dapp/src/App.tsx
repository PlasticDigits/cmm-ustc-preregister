import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/common/Toast';
import { HomePage } from './pages/HomePage';
import { BSCPage } from './pages/BSCPage';
import { TerraClassicPage } from './pages/TerraClassicPage';
import './assets/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ToastWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, removeToast } = useToast();
  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <ToastWrapper>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/bsc" element={<BSCPage />} />
              <Route path="/terraclassic" element={<TerraClassicPage />} />
            </Routes>
          </ToastWrapper>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
