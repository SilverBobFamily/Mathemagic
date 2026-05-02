import { render, screen, fireEvent } from '@testing-library/react';
import CardBrowserModal from '../CardBrowserModal';
import type { Card, Release } from '@/lib/types';

const makeCard = (id: number, name: string): Card => ({
  id, release_id: 1, name, type: 'creature',
  value: 5, operator: null, operator_value: null,
  effect_type: null, art_emoji: '⚡', art_url: null,
  flavor_text: 'Test flavor', effect_text: null,
});

const release: Release = { id: 1, name: 'Test Release', icon: '🏺', number: 1, color_hex: '#5c6bc0', private: false };

const cards = [makeCard(1, 'Alpha'), makeCard(2, 'Beta'), makeCard(3, 'Gamma')];

describe('CardBrowserModal', () => {
  it('renders the card at the initial index', () => {
    render(<CardBrowserModal cards={cards} initialIndex={1} release={release} onClose={() => {}} />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows the correct counter', () => {
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={() => {}} />);
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('navigates to next card on Next card click', () => {
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('Next card'));
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('navigates to previous card on Previous card click', () => {
    render(<CardBrowserModal cards={cards} initialIndex={2} release={release} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('Previous card'));
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('disables Previous card button at first card', () => {
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={() => {}} />);
    expect(screen.getByLabelText('Previous card')).toBeDisabled();
  });

  it('disables Next card button at last card', () => {
    render(<CardBrowserModal cards={cards} initialIndex={2} release={release} onClose={() => {}} />);
    expect(screen.getByLabelText('Next card')).toBeDisabled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = jest.fn();
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates with keyboard arrow keys', () => {
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={() => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Beta')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('calls onClose when overlay backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<CardBrowserModal cards={cards} initialIndex={0} release={release} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('card-browser-modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
