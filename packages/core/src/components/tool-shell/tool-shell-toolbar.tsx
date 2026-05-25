import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useShell } from './tool-shell-context';
import { Undo, Redo, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme-provider/theme-provider';
import { t } from '../../i18n/strings';

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

function modKey(): string {
  return isMac() ? 'Cmd' : 'Ctrl';
}

function TooltipLabel({ text }: { text: string }) {
  return (
    <span className="toolbar-tooltip" role="tooltip">
      {text}
    </span>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- mounting guard to avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="toolbar-btn theme-toggle-btn"
        aria-label="Toggle theme"
        title="Toggle theme"
        disabled
      >
        <span className="theme-toggle-icon">
          <span style={{ width: 16, height: 16, display: 'inline-block' }} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="toolbar-btn theme-toggle-btn"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={resolvedTheme === 'dark' ? t('switchToLightMode') : t('switchToDarkMode')}
      title={resolvedTheme === 'dark' ? 'Light mode (D)' : 'Dark mode (D)'}
    >
      <span className="theme-toggle-icon">
        <Sun
          className={resolvedTheme === 'dark' ? 'fade-in' : 'fade-out'}
          size={16}
          strokeWidth={1.5}
        />
        <Moon
          className={resolvedTheme === 'dark' ? 'fade-out' : 'fade-in'}
          size={16}
          strokeWidth={1.5}
        />
      </span>
    </button>
  );
}

function ContrastToggle() {
  const { resolvedContrast, setContrast } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="toolbar-btn contrast-toggle-btn"
        aria-label={t('enableHighContrast')}
        title={t('enableHighContrast')}
        disabled
      >
        <span aria-hidden="true">HC</span>
      </button>
    );
  }

  const isHighContrast = resolvedContrast === 'more';
  return (
    <button
      type="button"
      className="toolbar-btn contrast-toggle-btn"
      onClick={() => setContrast(isHighContrast ? 'normal' : 'more')}
      aria-pressed={isHighContrast}
      aria-label={isHighContrast ? t('disableHighContrast') : t('enableHighContrast')}
      title={isHighContrast ? t('disableHighContrast') : t('enableHighContrast')}
    >
      <span aria-hidden="true">HC</span>
    </button>
  );
}

export function Toolbar({ children }: { children?: ReactNode }) {
  const { config, actions, sidebarOpen, toggleSidebar, isMobile } = useShell();
  const brandText = actions.brandValue ?? config.theme?.brand ?? config.name;
  const brandIcon = config.theme?.icon;
  const brandUrl = config.theme?.brandUrl;

  const brandContent = (
    <>
      {brandIcon && <span className="toolbar-brand-icon">{brandIcon}</span>}
      {brandText}
    </>
  );

  const sidebarLabel = sidebarOpen
    ? isMobile
      ? t('hideOptions')
      : t('closeSidebar')
    : isMobile
      ? t('showOptions')
      : t('toggleSidebar');

  return (
    <header className="tool-shell-toolbar" role="toolbar" aria-label={t('toolToolbar')}>
      <div className="toolbar-left">
        {actions.isBrandEditing ? (
          <input
            type="text"
            className="toolbar-brand-input"
            value={actions.brandValue ?? brandText}
            onChange={(e) => actions.onBrandChange?.(e.target.value)}
            onBlur={() => actions.onBrandCommit?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') actions.onBrandCommit?.();
              if (e.key === 'Escape') actions.onBrandCancel?.();
            }}
            aria-label={t('rename')}
            autoFocus
          />
        ) : actions.onBrandClick ? (
          <button
            type="button"
            className="toolbar-brand toolbar-brand-button"
            onClick={actions.onBrandClick}
            aria-label={t('rename')}
          >
            {brandContent}
          </button>
        ) : brandUrl ? (
          <a href={brandUrl} className="toolbar-brand toolbar-brand-link">
            {brandContent}
          </a>
        ) : (
          <span className="toolbar-brand">{brandContent}</span>
        )}
        {config.features.undoRedo && (
          <>
            <button
              type="button"
              className="toolbar-btn"
              aria-label={`${t('undo')} (${modKey()}+Z)`}
              disabled={!actions.canUndo}
              onClick={actions.onUndo}
            >
              <Undo size={16} strokeWidth={1.5} />
              <TooltipLabel text={`${t('undo')} (${modKey()}+Z)`} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              aria-label={`${t('redo')} (${modKey()}${isMac() ? '+Shift+Z' : '+Y'})`}
              disabled={!actions.canRedo}
              onClick={actions.onRedo}
            >
              <Redo size={16} strokeWidth={1.5} />
              <TooltipLabel text={`${t('redo')} (${modKey()}${isMac() ? '+Shift+Z' : '+Y'})`} />
            </button>
            {actions.onReset && (
              <button
                type="button"
                className="toolbar-btn"
                aria-label={t('reset')}
                onClick={actions.onReset}
              >
                {t('reset')}
                <TooltipLabel text={t('reset')} />
              </button>
            )}
          </>
        )}
        {config.features.sidebar && (
          <button
            type="button"
            className="toolbar-btn toolbar-btn-sidebar"
            onClick={toggleSidebar}
            aria-label={sidebarLabel}
            data-sidebar-toggle
          >
            <Settings size={16} strokeWidth={1.5} />
            <TooltipLabel text={sidebarLabel} />
          </button>
        )}
        {children}
      </div>
      <div className="toolbar-right">
        {config.features.darkMode && <ThemeToggle />}
        <ContrastToggle />
        <button
          type="button"
          className="toolbar-btn shortcuts-toggle-btn"
          onClick={actions.onShowShortcuts}
          aria-label={t('keyboardShortcuts')}
          title={t('keyboardShortcuts')}
        >
          <span aria-hidden="true">?</span>
          <TooltipLabel text={`${t('keyboardShortcuts')} (?)`} />
        </button>
      </div>
    </header>
  );
}
Toolbar.displayName = 'Toolbar';
ThemeToggle.displayName = 'ThemeToggle';
ContrastToggle.displayName = 'ContrastToggle';
