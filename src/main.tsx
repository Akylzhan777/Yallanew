import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import i18n from './lib/i18n';
import { applyHomeSeo } from './lib/seo';
import './index.css';

applyHomeSeo(i18n.language);
i18n.on('languageChanged', (lng) => {
  if (window.location.pathname === '/' || window.location.pathname === '') {
    applyHomeSeo(lng);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
