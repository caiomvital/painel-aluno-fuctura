'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Fuctura Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('Fuctura Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
