'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type AiSettingsConfig, type AiProviderInfo } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  groq: 'Groq (gratuito)',
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<AiSettingsConfig | null>(null);
  const [providers, setProviders] = useState<AiProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user?.isAdmin) {
      router.replace('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      try {
        const [cfg, providerList] = await Promise.all([
          api.aiSettings.get(),
          api.aiSettings.listProviders(),
        ]);
        setSettings(cfg);
        setProviders(providerList);
        setSelectedProvider(cfg.provider.toLowerCase());
        setSelectedModel(cfg.model ?? '');
      } catch {
        toast.error('Erro ao carregar configurações');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const activeProvider = providers.find((p) => p.name === selectedProvider);

  async function save() {
    setIsSaving(true);
    try {
      await api.aiSettings.update({
        provider: selectedProvider.toUpperCase() as AiSettingsConfig['provider'],
        model: selectedModel || null,
      });
      toast.success('Configurações salvas');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  }

  if (loading || !user?.isAdmin || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Configurações do assistente de IA do Moneta</p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Provedor de IA</h2>
            <p className="text-sm text-muted-foreground">
              {user?.isAdmin
                ? 'Escolha qual modelo de IA será usado no chat'
                : 'Configuração global do assistente de IA'}
            </p>
          </div>
        </div>

        {user?.isAdmin ? (
          <>
            {/* Provider selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Provedor</label>
              <div className="grid grid-cols-2 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => {
                      setSelectedProvider(provider.name);
                      setSelectedModel(provider.defaultModel);
                    }}
                    className={cn(
                      'flex flex-col items-start rounded-lg border p-4 text-left transition-colors',
                      selectedProvider === provider.name
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent',
                    )}
                  >
                    <span className="font-medium text-sm">
                      {PROVIDER_LABELS[provider.name] ?? provider.name}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {provider.models.length} modelo{provider.models.length !== 1 ? 's' : ''} disponível
                      {provider.models.length !== 1 ? 'is' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Model selection */}
            {activeProvider && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo</label>
                <div className="space-y-2">
                  {activeProvider.models.map((model) => (
                    <button
                      key={model}
                      onClick={() => setSelectedModel(model)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                        selectedModel === model || (!selectedModel && model === activeProvider.defaultModel)
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'hover:bg-accent',
                      )}
                    >
                      <span>{model}</span>
                      {model === activeProvider.defaultModel && (
                        <span className="text-xs text-muted-foreground">padrão</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedProvider === 'anthropic' && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
                <strong>Atenção:</strong> O provedor Anthropic requer instalação do SDK adicional.
                Execute <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">npm install @anthropic-ai/sdk</code> no backend
                e configure <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">ANTHROPIC_API_KEY</code> no .env.
              </div>
            )}

            <Button onClick={save} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar configurações
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Provedor ativo: </span>
              <span className="font-medium">
                {PROVIDER_LABELS[settings?.provider.toLowerCase() ?? 'openai'] ?? settings?.provider}
              </span>
              {settings?.model && (
                <>
                  <span className="text-muted-foreground"> / </span>
                  <span className="font-medium">{settings.model}</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              A configuração do provedor de IA é gerenciada pelos administradores do Moneta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
