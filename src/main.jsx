import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { GigProvider } from './context/GigContext'
import ToastContainer from './components/Toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GigProvider>
      <App />
      <ToastContainer />
    </GigProvider>
  </React.StrictMode>,
)