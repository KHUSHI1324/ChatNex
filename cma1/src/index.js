import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Global Axios Request Interceptor: Automatically attach JWT token from localStorage
axios.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('chat-app-token');
    if (!token) {
      try {
        const stored = localStorage.getItem('chat-app-user');
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed?.token;
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
