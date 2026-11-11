# Focus

Organizador de estudos para concursos (com foco em carreiras policiais), por convite e instalável no celular.
Next.js 15 + TypeScript + Tailwind, Supabase (PostgreSQL com Row Level Security), hospedado na Vercel.

## O que o app faz (v1)

- **Hoje**: contagem regressiva com o brasão do concurso, metas da semana (horas, questões e % de acerto),
  checklist das matérias do dia com botão "Estudar", revisões do dia e simulados da semana.
- **Concursos**: vários ao mesmo tempo, com um principal. Catálogo de órgãos (PF, PRF, PMs, PCs, Bombeiros,
  Polícias Penais de todos os estados...), banca, cargo, data da prova e tipo de correção
  (Cebraspe: uma errada anula uma certa, ou múltipla escolha). O brasão é enviado pelo usuário e fica
  numa pasta privada da conta dele.
- **Modelo pronto PMAL 2026 — Soldado**: 13 matérias e a semana de estudos (2 blocos de 1h30 por dia +
  questões + revisão; sábado com revisão geral; domingo com simulado, análise de erros, redação e registro).
- **Cronograma**: modelo de semana editável (blocos de matéria, questões, revisão, simulado, redação...).
- **Estudar**: cronômetro que continua contando fora da tela e registro da sessão (tempo, tópico, questões,
  certas e erradas). Cada sessão agenda revisões para 1, 7 e 30 dias depois.
- **Edital**: matérias com peso e número de questões, tópicos com status (não visto → visto → revisado → dominado)
  e % do edital estudado. Dá para colar a lista de tópicos do edital, um por linha.
- **Simulados**: nota total ou por matéria, nota líquida no padrão Cebraspe, redação e análise dos erros,
  com gráfico de evolução.
- **Progresso**: horas por semana contra a meta, dia a dia, dias seguidos de estudo, desempenho por matéria
  e resumo da semana (o "registrar o desempenho" do domingo).
- **Importar questões do Qconcursos**: botão de favoritos (computador) ou copiar e colar (celular) a tabela
  "Estatísticas de Disciplinas". Prévia com a matéria do Focus de cada disciplina (o app lembra as escolhas),
  e o mesmo período não é contado duas vezes.
- **Caderno de erros**: assertiva, gabarito, motivo do erro e bizu; exporta para o Anki (Frente, Verso, Bizu, Tags).
- **Pomodoro** no cronômetro (25/5, 50/10, 90/15), com aviso sonoro; só o foco conta como estudo.
- **TAF**: índices do edital (modelo PMAL 2026 masculino/feminino), marcas dos treinos, apto/abaixo e evolução.
- **Redação**: banco de temas, nota, onde perdeu pontos e evolução.
- **Meta de nota**: nota de corte esperada, distância a cada simulado e onde estão os pontos mais fáceis.
- **Calendário de constância** no Progresso.
- **Lembretes no celular** (notificação diária no horário escolhido).
- **Convites** (administrador), **configurações** (perfil, tema claro/escuro, excluir conta) e **privacidade**.

## Segurança

- **Row Level Security** em todas as tabelas e no Storage: cada pessoa só vê os próprios dados e brasões.
- **Chaves estrangeiras compostas** `(id, user_id)`: ninguém liga uma matéria ao concurso de outra pessoa.
- **Convite validado dentro do banco** no cadastro. O primeiro usuário vira administrador.

## Como colocar no ar

### 1. Supabase

1. Em [supabase.com](https://supabase.com), crie um projeto novo (região **South America (São Paulo)**).
   Dá para usar a mesma conta do Flowly, mas crie um **projeto separado**.
2. Em **SQL Editor > New query**, rode **em ordem**, uma vez cada: `0001_schema.sql`, `0002_qconcursos_import.sql`
   e `0003_erros_taf_redacao_lembretes.sql` (pasta `supabase/migrations`).
   Ele cria as tabelas, as regras de segurança e o bucket privado `crests` dos brasões.
3. Em **Authentication > URL Configuration**: *Site URL* com o endereço do app e, em *Redirect URLs*,
   `http://localhost:3000/**` e o endereço da Vercel com `/**`.
4. Em **Authentication > Emails**, ajuste os links:
   - *Confirm signup*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
   - *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nova-senha`
5. Em **Project Settings > API**, copie a *Project URL* e a chave *anon public*.

### 2. Rodar no computador

Precisa do Node.js 22.18 ou mais novo.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do passo 1.5
npm run dev                  # http://localhost:3000
```

**Crie a sua conta primeiro** em `/cadastro`, sem código: o primeiro usuário vira administrador.
Depois, em **Concursos > Novo**, escolha o modelo **PMAL 2026 — Soldado** e envie o brasão.

### 3. Publicar na Vercel

1. Suba o projeto para o GitHub (sugestão: repositório `focus-estudos`).
2. Na Vercel, **Add New > Project**, importe o repositório.
3. Em *Environment Variables*: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL` (endereço da Vercel) e um `CRON_SECRET` longo e aleatório.
4. Deploy. Depois, atualize a *Site URL* e as *Redirect URLs* do Supabase.
5. Para o banco gratuito não pausar: no GitHub, em *Settings > Secrets and variables > Actions*, crie o
   secret `CRON_SECRET` (mesmo valor da Vercel) e a variável `SITE_URL` com o endereço do app.

### Lembretes no celular

1. Gere as chaves (uma vez): `npx web-push generate-vapid-keys`.
2. Na Vercel, cadastre `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (a privada como *Secret*) e faça Redeploy.
   A rotina usa também `SUPABASE_SERVICE_ROLE_KEY`, que a integração Vercel + Supabase já cria.
3. O GitHub Actions (`.github/workflows/reminders.yml`) chama `/api/push/cron` de hora em hora, com os mesmos
   `CRON_SECRET` e `SITE_URL` do keepalive.
4. No app: **Configurações → Lembretes no celular → Ativar notificações neste aparelho**.

### Instalar no celular / tablet

Abra o endereço no navegador e use **Adicionar à tela inicial**. Para gerar um APK, use o
[PWABuilder](https://www.pwabuilder.com) com o endereço do app, como no Flowly.

## Testes

```bash
npm test          # datas no fuso de Alagoas e nota Cebraspe
npm run typecheck
```

Teste de segurança do banco (PostgreSQL local): rode `supabase/tests/supabase_stub.sql`, a migração e
`supabase/tests/rls_test.sql` num banco vazio. **Nunca** rode o stub no Supabase de verdade.
