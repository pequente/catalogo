# Configurar loja a partir do template

Cada loja é um repositório independente criado a partir do template [`joaop06/vina`](https://github.com/joaop06/vina). O cliente edita **somente** a pasta `data/`. O código vem do repositório base via sync automático.

## 1. Criar o repositório

1. No repo base, use **Use this template → Create a new repository** na conta do cliente.
2. Não use fork: em templates o GitHub Actions já costuma vir habilitado.

## 2. Habilitar Actions e permissões

1. Aba **Actions** → confirme a habilitação dos workflows, se solicitado.
2. **Settings → Actions → General → Workflow permissions** → marque **Read and write permissions**. Sem isso o `git push` do workflow falha.

## 3. Conectar à Vercel

1. Importe o repositório da loja na Vercel (nunca o `joaop06/vina` base).
2. **Production Branch:** `main` (o push do sync dispara o redeploy).
3. Variáveis de ambiente (Production):

| Variável | Valor |
|----------|--------|
| `DATA_BACKEND` | `github` |
| `GITHUB_OWNER` | Dono do repo da loja |
| `GITHUB_REPO` | Nome do repo da loja |
| `GITHUB_BRANCH` | `main` |
| `GITHUB_TOKEN` | PAT com Contents read/write só no repo da loja |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Login do painel |
| `JWT_SECRET` | Segredo longo (≥ 32 caracteres) |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site |

## 4. `SYNC_TOKEN` (recomendado)

O sync aplica a árvore do repo base como fonte da verdade do código — inclusive `.github/workflows/`. O `GITHUB_TOKEN` padrão do Actions **não pode** fazer push de alterações nessa pasta. Sem `SYNC_TOKEN`, o job sincroniza código e `data/` normalmente, mas **falha** assim que o base alterar o próprio workflow (ou qualquer arquivo em `.github/workflows/`).

Cadastre o secret em toda loja em produção:

1. Gere um PAT **fine-grained** (Settings → Developer settings → Personal access tokens).
2. Conceda acesso aos repositórios de loja com:
   - **Contents:** Read and write
   - **Workflows:** Read and write
3. No repo da loja: **Settings → Secrets and variables → Actions → New repository secret**
   - Nome: `SYNC_TOKEN`
   - Valor: o PAT

O workflow usa `secrets.SYNC_TOKEN` quando existe; senão cai no `GITHUB_TOKEN`.

**Segurança:** um PAT cadastrado no repo da loja dá poder de escrita com a identidade do dono do token. Use fine-grained, restrito aos repositórios necessários e com escopo mínimo.

## 5. Preencher `data/`

O cliente edita os JSONs (e mídia) em `data/` com os dados da loja. **Nada de código dentro de `data/` e nenhum dado fora de `data/`.**

## 6. Como a sync funciona

| Gatilho | Quando |
|---------|--------|
| Cron | 1× por hora (minuto :17 UTC) |
| Manual | **Actions → Sync upstream (auto-merge) → Run workflow** |

Fluxo:

1. Você corrige/melhora algo e faz push na `main` do repo base.
2. No horário do cron (ou no disparo manual), o workflow da loja busca o upstream.
3. Aplica a árvore de `upstream/main` no código, restaura `data/` da loja e faz push na `main` (se houver mudança).
4. A Vercel detecta o push e faz o redeploy.

Repos criados via **Use this template** não compartilham histórico Git com o base. Por isso o sync **não usa merge**: usa `git read-tree` para aplicar o código do upstream e devolve `data/` ao estado do cliente.

## 7. Limitações

- **Código do base sempre prevalece:** se o cliente editar um arquivo fora de `data/`, a próxima sync sobrescreve com a versão do upstream. Mitigação: o cliente só edita `data/`.
- **Cron não é exato:** o GitHub Actions pode atrasar alguns minutos; use `workflow_dispatch` para forçar.
- **Atualização de workflows:** exige `SYNC_TOKEN` (PAT com escopo Workflows). Sem ele, mudanças em `.github/workflows/` no base quebram o push do sync.
- **Histórico divergente:** oriente o cliente a **nunca** fazer force-push na `main`.

## 8. Checklist

| Item | Onde |
|------|------|
| Marcar o repo base como Template repository | Settings do `joaop06/vina` |
| Cliente cria repo via template | Conta do cliente |
| Habilitar Actions + Read and write permissions | Repo da loja |
| Cadastrar `SYNC_TOKEN` | Secrets do repo da loja |
| Conectar à Vercel (Production Branch = `main`) | Conta do cliente |
| Preencher `data/` com os dados reais | Repo da loja |
