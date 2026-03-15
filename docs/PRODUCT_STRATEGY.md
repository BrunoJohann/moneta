# MONETA — Estratégia de Produto & Crescimento (MVP)

## 1. ICP (Ideal Customer Profile)

**Perfil primário:** Jovens profissionais brasileiros (22–35 anos), urbanos, mobile-first, que já usam WhatsApp diariamente e têm dificuldade em manter controle financeiro com planilhas ou apps complexos.

**Segmentos prioritários:**
- **Assalariados CLT** que querem entender para onde vai o salário
- **Autônomos e freelancers** com renda variável que precisam de visibilidade
- **Casais** que dividem despesas e querem transparência financeira

**Características comportamentais:**
- Preferem comunicação por texto (WhatsApp nativo)
- Abandonam apps financeiros em < 7 dias por fricção de input
- Querem respostas rápidas, não dashboards complexos
- Sensíveis a preço, mas pagam por conveniência real

**Anti-persona:** Investidores avançados, controllers financeiros, público 50+.

---

## 2. Posicionamento

> **"Sua assessora financeira no WhatsApp."**

Moneta é a alternativa acessível e conversacional a planilhas, apps bancários confusos e assessores financeiros caros. Você manda uma mensagem, a Moneta organiza tudo.

**Diferencial vs MeuAssessor:**
- Interface conversacional (WhatsApp-first, não form-first)
- Onboarding em < 2 minutos (vs cadastro longo)
- AI coach proativo (insights diários, não só relatórios passivos)
- Design mobile-first moderno (não adaptação de desktop)

---

## 3. Pricing

| Plano | Preço | Inclui |
|-------|-------|--------|
| **Grátis** | R$ 0 | 30 transações/mês, resumo semanal, 1 meta |
| **Pro** | R$ 19,90/mês | Ilimitado: transações, metas, lembretes, coach diário, previsões, exportação |
| **Trial Pro** | 14 dias grátis | Acesso completo ao Pro sem cartão |

**Estratégia de conversão:**
- Trial automático no cadastro (sem cartão)
- No dia 12, alerta: "Seu trial acaba em 2 dias. Você já registrou X transações e economizou insights em Y categorias."
- Paywall suave: após trial, funcionalidades Pro ficam visíveis mas bloqueadas com CTA de upgrade

---

## 4. Fluxo de Onboarding (primeiros 5 minutos)

```
1. Landing page → clica "Começar grátis"
2. Digita email → recebe código de 6 dígitos
3. Verifica código → entra no dashboard
4. Modal de boas-vindas:
   "Oi! Eu sou a Moneta. Me conta: quanto você ganha por mês?"
   → Usuário digita no composer: "recebo 5000 por mês"
   → Moneta parseia e mostra: "Receita: R$ 5.000,00 — Salário"
   → Usuário confirma
5. Segunda mensagem guiada:
   "Agora me diz um gasto recente. Ex: 'gastei 80 no mercado'"
   → Usuário registra primeira despesa
6. Dashboard já mostra saldo, primeira transação, e preview de insights
7. CTA: "Conecte seu WhatsApp para registrar gastos a qualquer hora"
   → Usuário informa número → recebe mensagem de confirmação no WhatsApp
```

**Tempo total:** < 3 minutos até primeiro "aha moment" (ver transação no dashboard).

---

## 5. Retention Hooks

### Diário
- **Insight matinal (8h via WhatsApp):** "Bom dia! Ontem você gastou R$ 85. Seu ritmo mensal está em R$ 2.400 de R$ 3.000 de limite. Tudo sob controle."
- **Lembrete de registro:** Se não registrou nada em 24h: "Ei, teve algum gasto ontem? Me conta!"

### Semanal
- **Resumo semanal (domingo):** "Esta semana: R$ 420 gastos. Top categorias: Alimentação (R$ 180), Transporte (R$ 95). Comparado à semana passada: -12%."

### Mensal
- **Card compartilhável:** Imagem bonita com resumo mensal para compartilhar no Instagram/Stories
- **Progresso de metas:** "Você está 65% mais perto da sua meta de viagem!"

### Gamificação (v2, preparar estrutura)
- Streak de dias consecutivos registrando gastos
- Badges: "7 dias seguidos", "Primeiro mês completo", "Meta atingida"

---

## 6. Métricas

### North Star Metric
**WAU (Weekly Active Users) que registram ≥ 3 transações por semana.**

Justificativa: 3 transações/semana indica hábito formado e valor real percebido.

### KPIs Operacionais

| Métrica | Meta MVP (3 meses) |
|---------|-------------------|
| DAU/MAU | > 40% |
| Mensagens parseadas/dia | > 500 |
| Taxa parse com sucesso | > 90% |
| Trial → Paid | > 8% |
| Retenção D7 | > 50% |
| Retenção D30 | > 25% |
| NPS | > 40 |
| Tempo até 1ª transação | < 3 min |

---

## 7. Viral Loops

### Card Compartilhável (MVP)
Ao final de cada mês, gerar imagem com:
- Resumo: receitas, despesas, saldo
- Top 3 categorias
- Progresso de metas
- Branding Moneta + link de convite
- Formato otimizado para Stories (1080x1920)

### Convite de Amigo (MVP)
- Cada usuário ganha link único
- Amigo que se cadastra: ambos ganham 1 mês Pro grátis
- Limite: 5 convites ativos por usuário

### Modo Casal (v2)
- Vincular duas contas
- Dashboard compartilhado de despesas
- Divisão automática de contas
- "Minha cara-metade gastou R$ 200 em roupas esse mês 👀"

---

## 8. Landing Page — Estrutura e Copy (pt-BR)

### Hero Section
**Headline:** "Controle suas finanças pelo WhatsApp."
**Sub:** "Mande uma mensagem, a Moneta organiza tudo. Sem planilha, sem app complicado."
**CTA:** "Começar grátis →"
**Visual:** Mockup de conversa WhatsApp + dashboard side-by-side

### Social Proof
"Mais de X pessoas já organizaram suas finanças com a Moneta."
(usar counter dinâmico quando houver base)

### Como Funciona (3 passos)
1. **Mande uma mensagem** — "Diga 'gastei 50 no mercado' pelo WhatsApp ou pelo dashboard."
2. **A Moneta organiza** — "Sua AI financeira categoriza, registra e analisa automaticamente."
3. **Receba insights** — "Todo dia, receba dicas personalizadas para fechar o mês no positivo."

### Features
- "Registre gastos em 3 segundos pelo WhatsApp"
- "Dashboard inteligente com gráficos e previsões"
- "Coach financeiro com IA que te ajuda todo dia"
- "Metas e lembretes para nunca mais esquecer uma conta"

### Dashboard Preview
Screenshot/mockup interativo do dashboard com dados fictícios

### Pricing
Tabela com Grátis vs Pro (ver seção 3)

### FAQ
- "É seguro?" → Criptografia, não acessamos contas bancárias
- "Funciona sem WhatsApp?" → Sim, o dashboard web tem todas as funções
- "Posso cancelar quando quiser?" → Sim, sem fidelidade

### Footer CTA
**"Comece agora. É grátis."**
**CTA:** "Criar minha conta →"
