import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import '../../styles/globals.css';
import '../../styles/themes.css';
import { ThemeManager } from '../../lib/theme-manager';

// Initialize theme system
ThemeManager.initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
