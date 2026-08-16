import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public account deletion page', () => {
  it('contains the external deletion form and privacy link', () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'public/delete-account.html'), 'utf8');
    expect(html).toContain('Solicitar exclusão');
    expect(html).toContain('/api/billing/account-deletion/request');
    expect(html).toContain('/privacy.html');
    expect(html).toContain('EXCLUIR MINHA CONTA');
  });
});
