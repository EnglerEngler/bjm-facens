# Frontend Next - BJM Prescricao Assistida

## Requisitos
- Node.js 20+
- Backend rodando em `http://localhost:3333` (ou ajuste o `.env.local`)

## Ambiente
Arquivo `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3333
NEXT_PUBLIC_DEFAULT_PATIENT_ID=patient_4
```

## Executar em desenvolvimento
```bash
npm install
npm run dev
```

Acesse: `http://127.0.0.1:3002`

## Validacao
```bash
npm run lint
npm test -- --runInBand
npm run build
```
