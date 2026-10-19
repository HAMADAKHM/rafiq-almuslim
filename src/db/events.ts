// إشعار بسيط بتغير البيانات حتى تُحدِّث الواجهات نفسها تلقائيًا.
type Listener = (topic: string) => void
const listeners = new Set<Listener>()

export function notifyChange(topic: string) {
  for (const l of listeners) l(topic)
}

export function onChange(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}
