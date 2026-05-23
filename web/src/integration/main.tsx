import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ShaderView } from '@/ux/ShaderView';
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />} />
        <Route path="/view" element={<ShaderView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
