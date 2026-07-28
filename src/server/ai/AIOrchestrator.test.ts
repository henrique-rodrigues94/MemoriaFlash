import { describe, it, expect, vi, afterEach } from 'vitest';
import { AIOrchestrator } from './AIOrchestrator';
import { AIProvider, AIProviderError, GenerateJSONParams } from './types';

function makeProvider(overrides: Partial<AIProvider> & { id: string }): AIProvider {
  return {
    label: overrides.id,
    tier: 'free',
    isConfigured: () => true,
    generateJSON: async () => ({ ok: true }),
    ...overrides,
  };
}

const dummyParams: GenerateJSONParams = {
  systemPrompt: 'system',
  userPrompt: 'user',
  schemaHint: '{}',
};

afterEach(() => {
  vi.useRealTimers();
});

describe('AIOrchestrator — fallback multi-provedor', () => {
  it('usa o primeiro provedor disponível quando ele funciona', async () => {
    const primary = makeProvider({ id: 'primary', generateJSON: async () => ({ value: 1 }) });
    const secondary = makeProvider({ id: 'secondary', generateJSON: async () => ({ value: 2 }) });
    const orchestrator = new AIOrchestrator([primary, secondary]);

    const result = await orchestrator.generateJSON(dummyParams);
    expect(result.providerUsed).toBe('primary');
    expect(result.data).toEqual({ value: 1 });
  });

  it('faz fallback para o próximo provedor quando o primeiro falha', async () => {
    const failing = makeProvider({
      id: 'failing',
      generateJSON: async () => {
        throw new Error('boom');
      },
    });
    const backup = makeProvider({ id: 'backup', generateJSON: async () => ({ value: 'ok' }) });
    const orchestrator = new AIOrchestrator([failing, backup]);

    const result = await orchestrator.generateJSON(dummyParams);
    expect(result.providerUsed).toBe('backup');
  });

  it('ignora provedores não configurados (sem chave de API)', async () => {
    const unconfigured = makeProvider({
      id: 'unconfigured',
      isConfigured: () => false,
      generateJSON: async () => ({ value: 'nunca deveria rodar' }),
    });
    const configured = makeProvider({ id: 'configured', generateJSON: async () => ({ value: 'ok' }) });
    const orchestrator = new AIOrchestrator([unconfigured, configured]);

    const result = await orchestrator.generateJSON(dummyParams);
    expect(result.providerUsed).toBe('configured');
  });

  it('lança erro claro quando TODOS os provedores falham', async () => {
    const a = makeProvider({
      id: 'a',
      generateJSON: async () => {
        throw new Error('falha a');
      },
    });
    const b = makeProvider({
      id: 'b',
      generateJSON: async () => {
        throw new Error('falha b');
      },
    });
    const orchestrator = new AIOrchestrator([a, b]);

    await expect(orchestrator.generateJSON(dummyParams)).rejects.toThrow(/falha a/);
  });

  it('coloca provedor em cooldown após rate limit (429) e não tenta ele de novo até o cooldown passar', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    let callCount = 0;
    const rateLimited = makeProvider({
      id: 'rate-limited',
      generateJSON: async () => {
        callCount++;
        throw new AIProviderError('quota exceeded', 'rate-limited', true, 429);
      },
    });
    const backup = makeProvider({ id: 'backup', generateJSON: async () => ({ value: 'ok' }) });
    const orchestrator = new AIOrchestrator([rateLimited, backup]);

    // Primeira chamada: tenta o rate-limited (falha), cai pro backup.
    await orchestrator.generateJSON(dummyParams);
    expect(callCount).toBe(1);

    // Segunda chamada, poucos segundos depois: NÃO deveria tentar o
    // provedor em cooldown de novo (ele fica pulado até o tempo passar).
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));
    await orchestrator.generateJSON(dummyParams);
    expect(callCount).toBe(1); // continua 1 — não foi chamado de novo

    const statusDuringCooldown = orchestrator.getStatus().find((s) => s.id === 'rate-limited')!;
    expect(statusDuringCooldown.available).toBe(false);

    // Depois do cooldown (10 minutos), volta a tentar normalmente.
    vi.setSystemTime(new Date('2026-01-01T00:15:00Z'));
    await orchestrator.generateJSON(dummyParams);
    expect(callCount).toBe(2);
  });

  it('provedor "local" nunca entra em cooldown (é sempre a rede de segurança final)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    let localCallCount = 0;
    const local = makeProvider({
      id: 'local',
      tier: 'local',
      generateJSON: async () => {
        localCallCount++;
        return { value: 'fallback local' };
      },
    });
    const orchestrator = new AIOrchestrator([local]);

    await orchestrator.generateJSON(dummyParams);
    await orchestrator.generateJSON(dummyParams);
    expect(localCallCount).toBe(2);
    expect(orchestrator.getStatus()[0].available).toBe(true);
  });

  it('resetCooldown permite forçar um provedor a ficar disponível de novo manualmente', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    let callCount = 0;
    const flaky = makeProvider({
      id: 'flaky',
      generateJSON: async () => {
        callCount++;
        if (callCount === 1) throw new Error('falha temporária');
        return { value: 'ok agora' };
      },
    });
    const orchestrator = new AIOrchestrator([flaky]);

    await expect(orchestrator.generateJSON(dummyParams)).rejects.toThrow();
    expect(orchestrator.getStatus()[0].available).toBe(false);

    orchestrator.resetCooldown('flaky');
    expect(orchestrator.getStatus()[0].available).toBe(true);

    const result = await orchestrator.generateJSON(dummyParams);
    expect(result.providerUsed).toBe('flaky');
  });

  it('getStatus nunca expõe chaves de API, apenas metadados', async () => {
    const orchestrator = new AIOrchestrator([makeProvider({ id: 'p1' })]);
    const status = orchestrator.getStatus()[0];
    expect(status).toEqual(
      expect.objectContaining({ id: 'p1', label: 'p1', tier: 'free', configured: true, available: true })
    );
    expect(Object.keys(status)).not.toContain('apiKey');
  });
});
