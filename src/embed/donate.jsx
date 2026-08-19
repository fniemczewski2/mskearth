import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import DonateStripe from '../features/donate/donate.jsx';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../style/index.css';
import '../style/embed.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <main className="embed embed--full">
          <DonateStripe />
        </main>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
