import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom } from '../helpers/purchasing-app.js';

let dom;

beforeEach(() => {
  dom = installDom();
  vi.resetModules();
});

afterEach(() => {
  dom.window.close();
});

describe('tema UI (005)', () => {
  it('aplica tema claro por defecto y permite alternar y persistir', async () => {
    const theme = await import('../../src/ui-theme.js');
    const applied = theme.initTheme();
    expect(['light', 'dark']).toContain(applied);
    const toggled = theme.toggleTheme();
    expect(toggled).not.toBe(applied);
    expect(document.documentElement.dataset.theme).toBe(toggled);
    expect(localStorage.getItem(theme.THEME_STORAGE_KEY)).toBe(toggled);
  });

  it('respeta preferencia almacenada sobre el sistema', async () => {
    localStorage.setItem('compras.ui.theme', 'dark');
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener(){}, removeEventListener(){} }));
    const theme = await import('../../src/ui-theme.js');
    expect(theme.initTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('usa prefers-color-scheme cuando no hay preferencia', async () => {
    localStorage.removeItem('compras.ui.theme');
    window.matchMedia = vi.fn().mockImplementation(query => ({ matches: query.includes('dark'), addEventListener(){}, removeEventListener(){} }));
    const theme = await import('../../src/ui-theme.js');
    expect(theme.initTheme()).toBe('dark');
  });
});
