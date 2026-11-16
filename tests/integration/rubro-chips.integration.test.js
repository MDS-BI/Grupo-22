import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootPurchasing, installDom, installStyles } from '../helpers/purchasing-app.js';

let dom;
beforeEach(() => { dom = installDom(); installStyles(dom); });
afterEach(() => { dom.window.close(); });

describe('chips rubros (005 placeholder)', () => {
  it('placeholder', async () => { await bootPurchasing(dom); expect(true).toBe(true); });
});
