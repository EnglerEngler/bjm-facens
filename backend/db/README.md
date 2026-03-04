# Database

Single source of truth for database evolution:
- `sequelize-cli` migrations in `db/migrations-cli`
- `sequelize-cli` seeders in `db/seeders`

## Commands
Run from `backend/`:

```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

## Notes
- Database target: MySQL
- Connection comes from `.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
