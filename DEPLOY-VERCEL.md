# Deploy BJM na Vercel

Arquitetura alvo:
- Landing page: GitHub Pages
- Frontend da aplicacao: Vercel
- Backend/API: Vercel
- Banco de dados: Aiven MySQL

Projetos Vercel:
- Projeto 1: `frontend-next/`
- Projeto 2: `backend/`

## 1. Visao geral

O frontend e o backend sobem como dois projetos independentes.

- `frontend-next/` publica a interface Next.js
- `backend/` publica o Express como uma unica Vercel Function
- o banco continua sendo MySQL externo

As rotas do backend continuam as mesmas:
- `/health`
- `/db/health`
- `/auth/*`
- `/patients/*`
- `/prescriptions/*`
- `/ai/*`

## 2. Banco no Aiven MySQL

1. Crie um servico MySQL no Aiven.
2. Anote:
   - host
   - porta
   - nome do banco
   - usuario
   - senha
3. Crie o database/schema do BJM se necessario.
4. Verifique no painel se a conexao exige TLS/SSL.

Variaveis esperadas pelo backend:

```env
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_LOGGING=
DB_SSL=
```

Observacoes:
- Se o Aiven exigir SSL, configure `DB_SSL=true`.
- O backend e as migrations foram preparados para SSL opcional.
- Se o servico usar cadeia de certificados nao reconhecida automaticamente pelo runtime da Vercel, pode ser necessario suporte adicional a CA customizada.

## 3. Variaveis do backend na Vercel

No projeto Vercel que aponta para `backend/`, configure:

```env
NODE_ENV=production
JWT_SECRET=
JWT_EXPIRES_IN=2h
REFRESH_SECRET=
REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://SEU-FRONTEND.vercel.app
CORS_ORIGIN=https://SEU-FRONTEND.vercel.app
EXPOSE_RESET_TOKEN_PREVIEW=false
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_LOGGING=false
DB_SSL=true
```

Observacoes:
- `FRONTEND_URL` e `CORS_ORIGIN` podem ser iguais.
- `CORS_ORIGIN` aceita mais de uma origem separada por virgula.
- Em producao o backend nao aceita `localhost` automaticamente.

## 4. Variaveis do frontend na Vercel

No projeto Vercel que aponta para `frontend-next/`, configure:

```env
NEXT_PUBLIC_API_BASE_URL=https://SEU-BACKEND.vercel.app
NEXT_PUBLIC_DEFAULT_PATIENT_ID=
```

Observacoes:
- Em producao nao existe fallback para `localhost`.
- Em desenvolvimento local, se a variavel nao existir, o frontend usa `http://localhost:3333`.

## 5. Deploy do backend na Vercel

No projeto `backend/`:

1. Crie um novo projeto na Vercel.
2. Aponte o Root Directory para `backend/`.
3. Defina as variaveis de ambiente do backend.
4. Faça o deploy.

Configuracao relevante ja incluida no repositório:
- `api/index.ts`: entrada serverless do Express
- `vercel.json`: reescreve todas as rotas para `/api`

Com isso, a URL publica continua expondo:
- `https://SEU-BACKEND.vercel.app/health`
- `https://SEU-BACKEND.vercel.app/db/health`

## 6. Deploy do frontend na Vercel

No projeto `frontend-next/`:

1. Crie outro projeto na Vercel.
2. Aponte o Root Directory para `frontend-next/`.
3. Configure `NEXT_PUBLIC_API_BASE_URL` com a URL do backend.
4. Faça o deploy.

## 7. Migrations e seeders no Aiven

As migrations continuam manuais, a partir de `backend/`.

Comandos:

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
```

Execute esses comandos com as mesmas variaveis do banco Aiven exportadas no shell local.

Exemplo:

```bash
export DB_HOST=...
export DB_PORT=...
export DB_NAME=...
export DB_USER=...
export DB_PASSWORD=...
export DB_LOGGING=false
export DB_SSL=true
npm run db:migrate
```

## 8. Como rodar localmente

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd frontend-next
cp .env.example .env.local
npm install
npm run dev
```

Fluxo local esperado:
- backend em `http://localhost:3333`
- frontend em `http://127.0.0.1:3002`

## 9. Testes apos deploy

Teste nesta ordem:

1. `GET /health`
2. `GET /db/health`
3. login
4. cadastro de clinica/admin
5. cadastro de medico
6. cadastro de paciente
7. criacao e leitura de paciente/prontuario
8. criacao de prescricao
9. analise com IA
10. PDF da prescricao

## 10. Observacoes sobre PDF

O backend foi ajustado para nao depender de caminho absoluto local.

Resolucao atual do logo:
- tenta `backend/public/logo-bjm.png`
- tenta o logo do frontend em ambiente local
- se nao encontrar o arquivo, o PDF continua sendo gerado sem quebrar

Se quiser o logo no PDF em producao com o projeto `backend/` isolado, inclua o arquivo em `backend/public/logo-bjm.png`.

## 11. Landing page

Depois do deploy:

1. copie a URL final do frontend
2. atualize o botao/link da landing page no GitHub Pages
3. publique a landing page com a URL final da aplicacao

## 12. Riscos restantes

- Vercel Functions nao sao o ambiente ideal para workloads longos; as rotas de IA podem ter mais sensibilidade a timeout do que em um servidor tradicional.
- O backend Express vira uma unica Function; qualquer dependencia extra aumenta bundle e cold start.
- O PDF nao quebra sem logo, mas o logo so aparecera em producao se voce o disponibilizar dentro do projeto `backend/`.
- Se o Aiven exigir validacao de CA customizada alem de `DB_SSL=true`, pode ser necessario adicionar suporte explicito a certificado.
