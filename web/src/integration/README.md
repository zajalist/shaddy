# integration/

**Owners:** both
See [`../../../CONTRACTS.md`](../../../CONTRACTS.md) §5.

The seam. `App.tsx`, `main.tsx`, the backend WebSocket client. Wires `renderer/`, `editor/`, `ux/`, and `backend/` together.

Everything in this folder is fair game to import from anywhere. **Nothing** else may import from this folder.
