# RotaFácil

Gestão de frota (reservas, agenda, manutenção e painel gerencial).

## Stack (Render)

- Next.js 16 + React 19
- PostgreSQL (`DATABASE_URL`)
- Fotos persistidas na tabela `photo_blobs`
- Autenticação básica via `APP_PASSWORD`

## Desenvolvimento local

```bash
npm ci
npm run dev
```

Sem `DATABASE_URL`, usa SQLite em `.data/rotafacil.sqlite`.

## Deploy no Render

1. Web Service a partir deste repositório
2. Language: **Node**
3. Build: `npm ci && npm run build`
4. Start: `npm run start`
5. Environment:
   - `DATABASE_URL` = Internal Database URL do Postgres no Render (**obrigatório**)
   - `APP_PASSWORD` = senha de acesso
   - `APP_SEED` = `true` na primeira subida
   - `NODE_VERSION` = `22.13.0` (ou superior)

Diagnóstico: `GET /api/health` deve retornar `"mode":"postgres"`.
Se aparecer aviso de SQLite nos logs de produção, a `DATABASE_URL` não está ligada ao serviço.

## Scripts

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |
