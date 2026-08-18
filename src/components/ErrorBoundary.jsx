import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Bez tego dowolny wyjatek w renderze kasuje cala strone do bialego ekranu.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Nieobsluzony blad renderowania:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1>Coś poszło nie tak</h1>
        <p>Odśwież stronę. Jeśli problem się powtarza, napisz na biuro@fpmsk.org.pl.</p>
        <button type="button" className="primaryBtn" onClick={() => window.location.reload()}>
          Odśwież stronę
        </button>
      </main>
    );
  }
}

ErrorBoundary.propTypes = { children: PropTypes.node };
