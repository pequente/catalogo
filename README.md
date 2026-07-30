# Vina

**Vina** é um catálogo digital para lojas que vendem pelo WhatsApp. Em vez de um e-commerce com pagamento online, a vitrine serve para apresentar produtos, organizar o carrinho e **abrir uma conversa no WhatsApp** já com a mensagem montada — o fechamento do pedido acontece no chat, do jeito que muitas lojas já trabalham no dia a dia.

---

## O que é

Um site com duas partes integradas:

- **Vitrine (pública):** páginas da loja, listagem de produtos, categorias, carrinho e informações como Sobre e Trocas.
- **Painel admin (privado):** onde você cadastra produtos, ajusta a aparência da loja, acompanha pedidos e clientes e configura como o WhatsApp entra na experiência.

Tudo fica sob o mesmo projeto: quem visita vê só a vitrine; quem administra entra pelo login do painel.

## Para que serve

Centralizar o catálogo em um endereço na web (link compartilhável, QR code, bio do Instagram) sem depender de planilhas ou álbum de fotos soltas. A loja ganha identidade visual (nome, logo, cores, layout), produtos com preço e variantes, e um fluxo claro do interesse até o contato no WhatsApp.

O admin também oferece visão de negócio (dashboard, pedidos registrados, clientes) para quem quer organizar a operação além da simples vitrine.

## Como funciona na prática

### Dados da loja

As informações da loja — produtos, categorias, banners, configurações do site, pedidos, clientes e imagens — ficam guardadas em arquivos dentro da pasta **`data/`** do repositório (principalmente JSON e pastas de mídia). Não há banco de dados separado: o que você altera no painel vira alteração nesses arquivos.

Em **desenvolvimento** no computador, o sistema usa uma cópia em **`data-dev/`** para não misturar testes com o conteúdo versionado. Em **produção** (por exemplo na Vercel), as mudanças feitas no admin podem ser gravadas de volta no repositório via GitHub, mantendo o catálogo persistente entre deploys.

### Vitrine e carrinho

O visitante navega pelo catálogo, vê detalhes do produto e pode montar um carrinho na própria vitrine. O carrinho é uma lista local de intenção de compra — não processa pagamento nem checkout bancário.

### WhatsApp e redirecionamento

O WhatsApp é o **canal de fechamento**, não um botão decorativo:

1. No painel (**Personalização → WhatsApp**), você define o número da loja e os textos das mensagens (saudação geral, interesse em um produto, pedido com vários itens do carrinho).
2. Na vitrine, botões como “WhatsApp” ou “Enviar pedido no WhatsApp” abrem o aplicativo ou a web do WhatsApp com uma **mensagem pronta**: nome do produto, variantes escolhidas, quantidades, referências e, se configurado, link da página do item.
3. O cliente envia a mensagem; a loja responde, confirma estoque e combina pagamento e entrega como já faz hoje.

Ou seja: o site **organiza e formata** o pedido; a **venda e o pagamento** continuam no WhatsApp.

### Personalização

Nome da loja, slogan, cores, logo, layout da home, menu, rodapé, Instagram, endereço, telefones e textos legais são editáveis no admin (**Personalização** → Geral, Textos, Tema, Vitrine, Navegação, WhatsApp, Contato).

A maior parte dos rótulos da vitrine (home, catálogo, produto, carrinho, cookies, modal de lead) fica em `data/configuracoes/` (`textos`, `rotulos`, `vitrine`, `comportamento`, `tema` e `seo`). Veja [docs/personalizacao.md](docs/personalizacao.md).

Variantes de produto usam `atributos` genéricos alinhados a `rotulos.dimensoes` (padrão: tamanho e cor). O servidor aplica **migrations** de JSON na inicialização; para rodar manualmente: `npm run data:migrate` (ledger em `data/configuracoes/migrations.json`).

---

## Configuração e gerenciamento (resumo técnico)

### Requisitos

- **Node.js 22** ou superior
- **npm** (dependências e scripts do projeto)

### Primeira vez no computador

```bash
cp .env.example .env.local
npm install
npm run dev:restore:data   # copia data/ → data-dev/ (ambiente local)
npm run dev
```

Abra o endereço que o terminal indicar (em geral `http://localhost:3000`). A vitrine usa os dados de **`data-dev/`**; a pasta **`data/`** no git funciona como modelo inicial (“seed”).

### Variáveis de ambiente (`.env.local`)

| Variável | Uso |
|----------|-----|
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Login do painel. Em produção, use senha forte. |
| `JWT_SECRET` | Segredo para sessão do admin (mínimo ~32 caracteres em produção). |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (links absolutos, SEO). |
| `DATA_BACKEND` | Em produção: `github` grava em `data/` via API do GitHub; `fs` usa disco. No `npm run dev`, **sempre** usa `data-dev/` (esta variável é ignorada). |
| `GITHUB_*` | Obrigatórias se `DATA_BACKEND=github` (token, dono, repositório, branch). |

Detalhes e comentários extras estão em **`.env.example`**.

### Dados locais (scripts úteis)

| Comando | O que faz |
|---------|-----------|
| `npm run dev:restore:data` | Copia `data/` → `data-dev/` |
| `npm run dev:reset:data` | Limpa `data-dev/` e restaura só o seed de `data/` |
| `npm run dev:seed` | Reset + catálogo grande (útil para testar dashboard e admin) |
| `npm run seed:validate` | Confere se o seed em `data/` está consistente |
| `npm run indices:validate -- --data=data-dev` | Valida índices de produtos após cópia ou seed |

Se produtos existirem mas listagens falharem, rode `npm run indices:rebuild -- --data=data-dev` (ou `indices:repair`).

### Produção

```bash
npm run build
npm run start
```

Na Vercel, configure `DATA_BACKEND=github` e as credenciais GitHub para que alterações do admin persistam no repositório. A Production Branch deve ser `main`: o workflow de sync faz push nela e dispara o redeploy.

### Login padrão em desenvolvimento

Usuário **`admin`** e senha **`admin123`** (conforme `.env.example`). Altere antes de expor o painel na internet.

### Testes e qualidade

```bash
npm run lint
npm test
```

Há scripts opcionais de medição de leitura (`baseline:read`, `phase6:verify`) documentados nos comentários do `.env.example`, voltados a evolução de performance do projeto.

### Lojas (template do repositório base)

Cada loja é um repositório criado via **Use this template**. O cliente edita só `data/`; o workflow **Sync upstream** aplica o código do base na `main` (preservando `data/`) e a Vercel redeploya. Cadastre `SYNC_TOKEN` na loja para o sync também atualizar `.github/workflows/`.

Passo a passo (template, Actions, Vercel, `SYNC_TOKEN`): **[docs/configurar-template-loja.md](docs/configurar-template-loja.md)**.

---

**Vina** — vitrine na web, conversa no WhatsApp.
