import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker: it makes the app installable ("Add to Home
// Screen") and keeps the programme readable when the wifi drops.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = process.env.PUBLIC_URL + '/service-worker.js';
    navigator.serviceWorker.register(url).catch(() => {});
  });
}
