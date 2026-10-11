import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ErrorBoundary from './ErrorBoundary.jsx';

function Bomb() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>content</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders a fallback UI instead of crashing when a child throws', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: 'Coś poszło nie tak' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odśwież stronę' })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
