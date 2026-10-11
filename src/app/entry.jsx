import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import RootRouter from './RootRouter.jsx';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../style/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <RootRouter />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
