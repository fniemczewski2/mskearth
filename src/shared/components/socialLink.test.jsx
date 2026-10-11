import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SocialLink from './socialLink.jsx';

describe('SocialLink', () => {
  it('renders an accessible external link with the expected icon', () => {
    render(<SocialLink link="https://example.com/msk" icon="bi bi-facebook" label="Facebook MSK" />);

    const link = screen.getByRole('link', { name: 'Facebook MSK' });
    expect(link).toHaveAttribute('href', 'https://example.com/msk');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    expect(link.querySelector('i')).toHaveClass('social-icon', 'bi', 'bi-facebook');
  });
});
