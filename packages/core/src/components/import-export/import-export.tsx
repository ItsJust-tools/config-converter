'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ExportFormat } from '../../types';
import { formatLabels } from '../../types';
import { t } from '../../i18n/strings';

export interface ImportExportProps {
  /** Supported formats for this tool */
  formats: ExportFormat[];
  /** Called when user wants to export */
  onExport?: (format: ExportFormat) => void;
  /** Called when a file is selected for import */
  onImport?: (file: File) => void | Promise<unknown>;
  /** Currently importing state */
  isImporting?: boolean;
  /** Currently exporting state */
  isExporting?: boolean;
  /** Called when user wants to create a shareable URL */
  onShare?: () => void | Promise<unknown>;
  /** Currently creating a share URL */
  isSharing?: boolean;
}

function ImportIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v8M5 8l3 3 3-3" />
      <path d="M3 11v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}
ImportIcon.displayName = 'ImportIcon';

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v8M5 8l3 3 3-3" />
      <rect x="3" y="11" width="10" height="2" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
DownloadIcon.displayName = 'DownloadIcon';

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5 8 1 4 5" />
      <path d="M8 1v9" />
      <path d="M3 9v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9" />
    </svg>
  );
}
ShareIcon.displayName = 'ShareIcon';

export function ImportExport({
  formats,
  onExport,
  onImport,
  isImporting = false,
  isExporting = false,
  onShare,
  isSharing = false,
}: ImportExportProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const typeaheadRef = useRef('');
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();
  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId]);

  useEffect(() => {
    return () => {
      if (typeaheadTimerRef.current) {
        clearTimeout(typeaheadTimerRef.current);
        typeaheadTimerRef.current = null;
      }
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        e.target instanceof Node &&
        !dropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen) {
      exportButtonRef.current?.focus();
      return;
    }
    listboxRef.current?.focus();
  }, [dropdownOpen]);

  const handleImportClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImport) return;
      onImport(file);
      e.target.value = '';
    },
    [onImport]
  );

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!dropdownOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelected((i) => Math.min(i + 1, formats.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelected((i) => Math.max(i - 1, 0));
          break;
        case 'Home':
          e.preventDefault();
          setSelected(0);
          break;
        case 'End':
          e.preventDefault();
          setSelected(formats.length - 1);
          break;
        case 'PageUp':
          e.preventDefault();
          setSelected((i) => Math.max(i - 5, 0));
          break;
        case 'PageDown':
          e.preventDefault();
          setSelected((i) => Math.min(i + 5, formats.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          const selectedFormat = formats[selected];
          if (selectedFormat) {
            onExport?.(selectedFormat);
          }
          setDropdownOpen(false);
          break;
        case 'Escape':
          e.preventDefault();
          setDropdownOpen(false);
          break;
        default:
          if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            e.preventDefault();
            typeaheadRef.current += e.key.toLowerCase();
            if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
            typeaheadTimerRef.current = setTimeout(() => {
              typeaheadRef.current = '';
            }, 500);

            const match = formats.findIndex((f) =>
              formatLabels[f]?.toLowerCase().startsWith(typeaheadRef.current)
            );
            if (match >= 0) setSelected(match);
          }
          break;
      }
    },
    [dropdownOpen, formats, onExport, selected]
  );

  return (
    <div
      className="import-export-group"
      ref={dropdownRef}
      role="group"
      aria-label={t('importExport')}
    >
      {/* Hidden file input for import */}
      <input
        ref={inputRef}
        type="file"
        accept=".itsjust.json,.json,.png,.jpg,.jpeg,.webp,.pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <span className="sr-only" aria-live="polite">
        {isImporting ? 'Importing file' : ''}
      </span>

      {/* Import Button */}
      <button
        type="button"
        className="toolbar-btn"
        onClick={handleImportClick}
        disabled={isImporting}
        title={t('import')}
        aria-label={t('import')}
      >
        <ImportIcon />
        <span>{t('import')}</span>
        {isImporting && <span className="spinner-icon" aria-hidden="true" />}
      </button>

      {/* Export Dropdown */}
      <div className="export-dropdown" onKeyDown={handleDropdownKeyDown}>
        <button
          ref={exportButtonRef}
          type="button"
          className="toolbar-btn"
          onClick={() => {
            if (!dropdownOpen && selected < 0 && formats.length > 0) {
              setSelected(0);
            }
            setDropdownOpen((v) => !v);
          }}
          disabled={isExporting || !onExport}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          aria-controls={dropdownOpen ? listboxId : undefined}
          aria-activedescendant={dropdownOpen && selected >= 0 ? optionId(selected) : undefined}
          title={t('export')}
          aria-label={t('export')}
        >
          <DownloadIcon />
          <span>{t('export')}</span>
          {isExporting && <span className="spinner-icon" aria-hidden="true" />}
        </button>

        {dropdownOpen && onExport && (
          <ul
            ref={listboxRef}
            id={listboxId}
            className="dropdown-menu"
            role="listbox"
            aria-label={t('export')}
            tabIndex={0}
            aria-activedescendant={selected >= 0 ? optionId(selected) : undefined}
          >
            {formats.map((f, i) => (
              <li id={optionId(i)} key={f} role="option" aria-selected={i === selected}>
                <button
                  type="button"
                  className={`dropdown-item ${i === selected ? 'dropdown-item-active' : ''}`}
                  onClick={() => {
                    onExport(f);
                    setDropdownOpen(false);
                  }}
                  onMouseEnter={() => setSelected(i)}
                  onMouseLeave={() => setSelected(-1)}
                >
                  <span className="dropdown-label">{formatLabels[f] ?? f.toUpperCase()}</span>
                  <span className="dropdown-shortcut">.{f}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="toolbar-btn"
        onClick={() => onShare?.()}
        disabled={isSharing || !onShare}
        title={t('share')}
        aria-label={t('share')}
      >
        <ShareIcon />
        <span>{t('share')}</span>
        {isSharing && <span className="spinner-icon" aria-hidden="true" />}
      </button>
    </div>
  );
}
ImportExport.displayName = 'ImportExport';
