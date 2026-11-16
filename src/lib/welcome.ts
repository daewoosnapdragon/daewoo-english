// The login screen asks for the welcome; the app shell plays it once.
// Kept in memory, so a reload or a restored session never replays it.
let pending = false
export const requestWelcome = () => { pending = true }
export const takeWelcome = () => { const p = pending; pending = false; return p }
