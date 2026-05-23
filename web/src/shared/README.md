# shared/

Types and constants safe for every module to import.

Rule: **types only, no behavior.** If a util grows logic, it belongs in `integration/` or a specific module.

(Currently empty after the photo-match backend was cut — `backend-types.ts` lived here. New cross-module types land here when the editor or UX surfaces grow them.)
