import { describe, expect, it } from 'vitest';

import { APP_NAME } from '../src/index';

/**
 * Test de humo del toolchain, no de una feature: comprueba que vitest corre y
 * que resuelve imports de TypeScript desde `src/`. Se puede borrar en cuanto
 * exista el primer test real de una feature.
 */
describe('toolchain', () => {
  it('resuelve imports de TypeScript desde src/', () => {
    expect(APP_NAME).toBe('mis-finanzas');
  });
});
