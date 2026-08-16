import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AdMob production configuration', () => {
  it('does not silently fall back to test IDs in production builds', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/adMobConfig.ts'), 'utf8');
    expect(source).toContain("const isProductionBuild = env.MODE === 'production' || env.VITE_APP_ENV === 'production';");
    expect(source).toContain('!hasProductionIds && !isProductionBuild');
    expect(source).toContain('VITE_ADMOB_USE_TEST_IDS');
  });
});
