// Public surface for the ux/ track.
//
// CONTRACTS.md §4 once described ux/ as the app shell (AppShell + share-url
// codec). In reality the live composer is the design/ track; ux/ is now just
// the Mascot character reused across pages. Consumers import from @/ux — never
// reach into @/ux/Mascot/* internals.
export { Mascot, MascotDemo } from './Mascot';
export type { MascotMood, MascotProps } from './Mascot';
