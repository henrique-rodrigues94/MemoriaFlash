import { AIProvider, AIProviderError, GenerateJSONParams, ProviderStatus } from './types';

const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 min quando o provedor diz "429 / quota excedida"
const GENERIC_ERROR_COOLDOWN_MS = 90 * 1000; // 1.5 min para outros erros (timeout, 5xx, etc.)

interface CooldownEntry {
  until: number;
  lastError: string;
}

/**
 * Orquestra múltiplos provedores de IA gratuitos com fallback automático e
 * "circuit breaker" (evita martelar um provedor que acabou de falhar).
 *
 * Ordem de tentativa = ordem do array passado no construtor. Coloque os
 * provedores gratuitos primeiro; provedores pagos (se configurados) ficam
 * por último, como upgrade opcional; o provedor local fica sempre por
 * último de todos, como rede de segurança.
 */
export class AIOrchestrator {
  private cooldowns = new Map<string, CooldownEntry>();

  constructor(private providers: AIProvider[]) {}

  /** Expõe a lista de provedores (para gerenciamento/status). */
  getProviders(): AIProvider[] {
    return this.providers;
  }

  private isAvailable(p: AIProvider): boolean {
    if (!p.isConfigured()) return false;
    const cd = this.cooldowns.get(p.id);
    if (cd && Date.now() < cd.until) return false;
    return true;
  }

  private setCooldown(id: string, ms: number, errorMsg: string) {
    this.cooldowns.set(id, { until: Date.now() + ms, lastError: errorMsg });
  }

  /** Limpa o cooldown de um provedor manualmente (ex: botão "tentar novamente" num painel admin). */
  resetCooldown(id: string) {
    this.cooldowns.delete(id);
  }

  async generateJSON(params: GenerateJSONParams): Promise<{ data: unknown; providerUsed: string }> {
    const attempted: string[] = [];
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!this.isAvailable(provider)) continue;
      attempted.push(provider.id);

      try {
        const data = await provider.generateJSON(params);
        return { data, providerUsed: provider.id };
      } catch (err) {
        const aiErr =
          err instanceof AIProviderError
            ? err
            : new AIProviderError(err instanceof Error ? err.message : String(err), provider.id);

        const cooldownMs = aiErr.isRateLimited ? RATE_LIMIT_COOLDOWN_MS : GENERIC_ERROR_COOLDOWN_MS;
        // Provedor local nunca entra em cooldown (é sempre a rede de segurança).
        if (provider.tier !== 'local') {
          this.setCooldown(provider.id, cooldownMs, aiErr.message);
        }

        errors.push(`${provider.id}: ${aiErr.message}`);
        console.warn(
          `[AIOrchestrator] Provedor "${provider.id}" falhou (${aiErr.isRateLimited ? 'rate limit' : 'erro'}). ` +
            `Cooldown ${Math.round(cooldownMs / 1000)}s. Tentando próximo provedor da fila...`
        );
      }
    }

    throw new Error(
      `Todos os provedores de IA disponíveis falharam. Tentados: [${attempted.join(', ') || 'nenhum configurado'}]. ` +
        `Detalhes: ${errors.join(' | ')}`
    );
  }

  getStatus(): ProviderStatus[] {
    return this.providers.map((p) => {
      const cd = this.cooldowns.get(p.id);
      const configured = p.isConfigured();
      const inCooldown = !!cd && Date.now() < cd.until;
      return {
        id: p.id,
        label: p.label,
        tier: p.tier,
        configured,
        available: configured && !inCooldown,
        cooldownUntil: inCooldown ? cd!.until : undefined,
        lastError: cd?.lastError,
      };
    });
  }
}
