import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { GigProvider } from './context/GigContext'
import { ThemeProvider } from './context/ThemeContext'
import ToastContainer from './components/Toast'
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ThemeProvider>
        <GigProvider>
          <App />
          <ToastContainer />
        </GigProvider>
      </ThemeProvider>
    </ClerkProvider>
  </React.StrictMode>,
)
