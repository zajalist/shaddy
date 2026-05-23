# shared/

Types and constants safe for every module to import. Mostly: `backend-types.ts` (mirror of the backend WS/REST schema in [`../../../CONTRACTS.md`](../../../CONTRACTS.md) §3).

Rule: **types only, no behavior.** If a util grows logic, it belongs in `integration/` or a specific module.
