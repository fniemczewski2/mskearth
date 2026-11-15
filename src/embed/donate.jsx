import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import DonateStripe from '../features/donate/donate.jsx';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';
import '../style/icons.css';
import '../style/embed/donate.css';
import '../style/embed/shared.css';

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
