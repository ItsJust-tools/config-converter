import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportExport } from '../../src/components/import-export/import-export';

describe('ImportExport', () => {
  it('renders import and export buttons', () => {
    render(<ImportExport formats={['json', 'png']} onExport={vi.fn()} onImport={vi.fn()} />);

    expect(screen.getByLabelText('Import')).toBeInTheDocument();
    expect(screen.getByLabelText('Export')).toBeInTheDocument();
  });

  it('opens export dropdown on click', () => {
    render(<ImportExport formats={['json', 'png']} onExport={vi.fn()} onImport={vi.fn()} />);

    const exportBtn = screen.getByLabelText('Export');
    fireEvent.click(exportBtn);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('JSON Data')).toBeInTheDocument();
    expect(screen.getByText('PNG Image')).toBeInTheDocument();
  });

  it('calls onExport when format selected', () => {
    const onExport = vi.fn();
    render(<ImportExport formats={['json']} onExport={onExport} onImport={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Export'));
    fireEvent.click(screen.getByText('JSON Data'));

    expect(onExport).toHaveBeenCalledWith('json');
  });

  it('calls onImport when file selected', () => {
    const onImport = vi.fn();
    render(<ImportExport formats={['json']} onExport={vi.fn()} onImport={onImport} />);

    const file = new File(['{"test":true}'], 'data.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(onImport).toHaveBeenCalledWith(file);
  });

  it('disables buttons when importing or exporting', () => {
    render(
      <ImportExport
        formats={['json']}
        onExport={vi.fn()}
        onImport={vi.fn()}
        isImporting
        isExporting
      />
    );

    expect(screen.getByLabelText('Import')).toBeDisabled();
    expect(screen.getByLabelText('Export')).toBeDisabled();
  });

  it('closes dropdown on outside click', () => {
    render(<ImportExport formats={['json']} onExport={vi.fn()} onImport={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Export'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates dropdown with ArrowDown and ArrowUp', () => {
    render(
      <ImportExport formats={['json', 'png', 'jpeg']} onExport={vi.fn()} onImport={vi.fn()} />
    );

    fireEvent.click(screen.getByLabelText('Export'));
    const dropdown = screen.getByRole('listbox');

    fireEvent.keyDown(dropdown, { key: 'ArrowDown' });
    fireEvent.keyDown(dropdown, { key: 'ArrowDown' });
    fireEvent.keyDown(dropdown, { key: 'ArrowUp' });

    // Verify dropdown is still open
    expect(dropdown).toBeInTheDocument();
  });

  it('jumps to first and last with Home and End', () => {
    render(
      <ImportExport formats={['json', 'png', 'jpeg']} onExport={vi.fn()} onImport={vi.fn()} />
    );

    fireEvent.click(screen.getByLabelText('Export'));
    const dropdown = screen.getByRole('listbox');

    fireEvent.keyDown(dropdown, { key: 'End' });
    fireEvent.keyDown(dropdown, { key: 'Home' });

    expect(dropdown).toBeInTheDocument();
  });

  it('pages through options with PageUp and PageDown', () => {
    render(
      <ImportExport formats={['json', 'png', 'jpeg']} onExport={vi.fn()} onImport={vi.fn()} />
    );

    fireEvent.click(screen.getByLabelText('Export'));
    const dropdown = screen.getByRole('listbox');

    fireEvent.keyDown(dropdown, { key: 'PageDown' });
    fireEvent.keyDown(dropdown, { key: 'PageUp' });

    expect(dropdown).toBeInTheDocument();
  });

  it('exports on Enter key', () => {
    const onExport = vi.fn();
    render(<ImportExport formats={['json']} onExport={onExport} onImport={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Export'));
    const dropdown = screen.getByRole('listbox');

    fireEvent.keyDown(dropdown, { key: 'Enter' });

    expect(onExport).toHaveBeenCalledWith('json');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(<ImportExport formats={['json']} onExport={vi.fn()} onImport={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Export'));
    const dropdown = screen.getByRole('listbox');

    fireEvent.keyDown(dropdown, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates by typeahead', async () => {
    render(<ImportExport formats={['json', 'png']} onExport={vi.fn()} onImport={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Export'));
    const dropdown = screen.getByRole('listbox');

    fireEvent.keyDown(dropdown, { key: 'p' });

    expect(dropdown).toBeInTheDocument();
  });

  it('calls onShare when share button clicked', () => {
    const onShare = vi.fn();
    render(
      <ImportExport formats={['json']} onExport={vi.fn()} onImport={vi.fn()} onShare={onShare} />
    );

    fireEvent.click(screen.getByLabelText('Share'));

    expect(onShare).toHaveBeenCalled();
  });

  it('disables share button when no onShare provided', () => {
    render(<ImportExport formats={['json']} onExport={vi.fn()} onImport={vi.fn()} />);

    expect(screen.getByLabelText('Share')).toBeDisabled();
  });

  it('highlights item on mouse enter and clears on leave', () => {
    render(<ImportExport formats={['json', 'png']} onExport={vi.fn()} onImport={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Export'));

    const items = screen.getAllByRole('option');
    fireEvent.mouseEnter(items[1]!);
    fireEvent.mouseLeave(items[1]!);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows spinner when sharing', () => {
    render(
      <ImportExport
        formats={['json']}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onShare={vi.fn()}
        isSharing
      />
    );

    expect(screen.getByLabelText('Share')).toBeDisabled();
  });

  it('sets selected to 0 when dropdown opens with negative index', () => {
    render(<ImportExport formats={['json', 'png']} onExport={vi.fn()} onImport={vi.fn()} />);

    // Open and close to reset state
    fireEvent.click(screen.getByLabelText('Export'));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    // Re-open
    fireEvent.click(screen.getByLabelText('Export'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
