// pages/_app.js
import { useEffect } from 'react';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then(reg => console.log('Service worker registered.', reg))
          .catch(err => console.error('Service worker registration failed:', err));
      });
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
