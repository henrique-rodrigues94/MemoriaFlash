import { describe, it, expect, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: { checkPermissions: vi.fn(), requestPermissions: vi.fn(), schedule: vi.fn(), cancel: vi.fn() } }));
vi.mock('firebase/messaging', () => ({ getMessaging: vi.fn(), getToken: vi.fn(), isSupported: vi.fn(async () => false) }));
vi.mock('../../lib/firebase', () => ({ app: {}, auth: {}, db: {}, doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), ensureAuthenticated: vi.fn() }));

describe('pushClient — timeouts de operações nativas', () => {
  it('a solicitação de permissão tem um timeout bem maior que operações locais rápidas, pois espera o usuário responder ao diálogo nativo', async () => {
    const { __testables } = await import('./pushClient');
    // Regressão do bug relatado: um timeout curto (5s) derrubava o "Salvar
    // preferências" só porque o usuário demorou alguns segundos para tocar
    // em "Permitir" no diálogo nativo do Android.
    expect(__testables.PERMISSION_REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(30000);
    expect(__testables.PERMISSION_REQUEST_TIMEOUT_MS).toBeGreaterThan(__testables.NATIVE_OPERATION_TIMEOUT_MS);
    expect(__testables.FIRESTORE_OPERATION_TIMEOUT_MS).toBeGreaterThan(__testables.NATIVE_OPERATION_TIMEOUT_MS);
  });

  it('withTimeout resolve normalmente quando a operação termina a tempo', async () => {
    const { __testables } = await import('./pushClient');
    const result = await __testables.withTimeout(Promise.resolve('ok'), 'Operação de teste', 50);
    expect(result).toBe('ok');
  });

  it('withTimeout rejeita com mensagem orientando a checar permissões quando a operação demora demais', async () => {
    const { __testables } = await import('./pushClient');
    const neverResolves = new Promise(() => undefined);
    await expect(__testables.withTimeout(neverResolves, 'Salvamento das preferências', 20))
      .rejects.toThrow(/Salvamento das preferências demorou\. Verifique as permissões do Android/);
  });
});
