# Appointley Backend - Architecture Guidelines

## Layering
The codebase follows a layered architecture:
- **Routes** (src/routes): Define endpoints, handle HTTP concerns (status codes, headers, validation via Zod)
- **Controllers** (src/controllers): Thin layer that translates between routes and services; contains no business logic
- **Services** (src/services): Contains business logic, orchestrates repositories and external APIs
- **Repositories** (src/repositories): Handle data access (SQL queries, etc.); return plain objects

## Rules
1. **Controllers are thin**: They should only call services and format responses. No business logic.
2. **Routes never touch SQL**: All database access must go through repositories.
3. **Zod at every boundary**: Validate all inputs (query, params, body) and outputs using Zod schemas.
4. **LLM output is untrusted**: Any data coming from an LLM must be validated and sanitized before use.
5. **LLM never writes to DB**: LLMs can only read data; write operations must be done through traditional service/repository layers.
6. **No new dependencies without asking**: Before adding a new npm package, consult with the team.

## Error Handling
- Use custom error classes from `lib/errors.ts` (AppError, ValidationError, NotFoundError, ConflictError)
- Central error handler in `src/app.ts` formats errors as JSON responses

## Logging
- Request logging via pino-http (configured in `src/app.ts`)
- Log level: info in production, debug otherwise

## Rate Limiting
- 60 requests per minute per IP (configured in `src/app.ts`)

## Environment Validation
- Uses Zod to validate environment variables (see `src/config/env.ts`)
- Required variables: DATABASE_URL, MISTRAL_API_KEY
- Optional: LangSmith/Langfuse keys for tracing

## Database
- PostgreSQL 16 (via docker-compose)
- Node-postgres (pg) driver
- Migrations via node-pg-migrate

## Scripts
- `dev`: Start server with tsx (watch mode)
- `build`: Compile TypeScript to dist/
- `typecheck`: Run TypeScript type checking
- `test`: Run Vitest tests
- `migrate`: Run database migrations