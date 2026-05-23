# ux/

**Owner:** andyhandev
**Public surface:** [`index.ts`](./index.ts) — see [`../../../CONTRACTS.md`](../../../CONTRACTS.md) §4.

App shell, responsive layout (desktop split / mobile stacked), touch gestures, template gallery, photo upload + camera capture, share URL (encode/decode), QR for "open on phone", demo polish.

UX is the only frontend module allowed to import from `renderer/` and `editor/`. That's by design — UX *is* the assembly layer.
