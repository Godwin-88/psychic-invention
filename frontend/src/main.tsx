import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SelectedAssetsProvider } from './context/SelectedAssetsContext';
import App from './App.tsx';
import 'katex/dist/katex.min.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SelectedAssetsProvider>
        <App />
      </SelectedAssetsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
