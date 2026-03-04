# Backend (KISS)

## Stack
- Node.js + TypeScript + Express
- MySQL + Sequelize
- Auth with JWT

## Folder layout
- `src/config`: environment config
- `src/db`: Sequelize connection and models
- `src/middleware`: auth and error middleware
- `src/routes`: HTTP routes
- `src/services`: business logic
- `src/utils`: shared utilities
- `src/tests`: integration tests
- `db/migrations-cli`: sequelize-cli migrations
- `db/seeders`: sequelize-cli seeders

## Run
```bash
npm install
cp .env.example .env
npm run dev
```

## Database
```bash
npx sequelize-cli db:migrate
```

Sem seed obrigatório: o ambiente inicia vazio para testar o fluxo completo de criação de clínica/usuários.
