import { Component } from 'react';
import PropTypes from 'prop-types';

import { CONTACT_EMAIL, DEFAULT_LANG, LANGS } from '../config/site.js';

// Granica bledow dziala takze wtedy, gdy tlumaczenia sie nie wczytaly, dlatego teksty sa w kodzie.
const TEXT = {
  pl: {
    title: 'Coś poszło nie tak',
    message: `Odśwież stronę. Jeśli problem się powtarza, napisz na ${CONTACT_EMAIL}.`,
    reload: 'Odśwież stronę',
  },
  en: {
    title: 'Something went wrong',
    message: `Reload the page. If the problem keeps happening, write to ${CONTACT_EMAIL}.`,
    reload: 'Reload the page',
  },
};

function currentLang() {
  const segment = window.location.pathname.split('/')[1]?.toLowerCase();
  return LANGS.includes(segment) ? segment : DEFAULT_LANG;
}

/**
 * Lapie bledy renderowania potomkow. Zmiana resetKey (np. adresu strony) zdejmuje stan bledu,
 * wiec awaria jednego widoku nie blokuje przejscia do innego.
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

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const text = TEXT[currentLang()];
    return (
      <main className="errorState">
        <h1>{text.title}</h1>
        <p>{text.message}</p>
        <button type="button" className="primaryBtn" onClick={() => window.location.reload()}>
          {text.reload}
        </button>
      </main>
    );
  }
}

ErrorBoundary.propTypes = { children: PropTypes.node, resetKey: PropTypes.string };
