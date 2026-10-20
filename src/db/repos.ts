// مستودعات البيانات: واجهة موحدة فوق IndexedDB تستخدمها الصفحات والخدمات.
import { db, type Bookmark, type MemoSegment, type Note, type ReadLog, type AdhkarLog, type Favorite, type MemoLog } from './db'
import { notifyChange } from './events'

export const kv = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const v = await (await db()).get('kv', key)
    return (v === undefined ? fallback : v) as T
  },
  async set(key: string, value: unknown) {
    await (await db()).put('kv', value, key)
    notifyChange('kv:' + key)
  },
}

export const bookmarks = {
  async all(): Promise<Bookmark[]> {
    return (await (await db()).getAll('bookmarks')).sort((a, b) => b.createdAt - a.createdAt)
  },
  /** إضافة علامة مسماة (لا تستبدل علامة موجودة بل تحدّث اسمها) */
  async add(surah: number, ayah: number, label?: string) {
    const d = await db()
    const id = `${surah}:${ayah}`
    const existing = await d.get('bookmarks', id)
    await d.put('bookmarks', { id, surah, ayah, createdAt: existing?.createdAt ?? Date.now(), label: label?.trim() || existing?.label })
    notifyChange('bookmarks')
  },
  async toggle(surah: number, ayah: number): Promise<boolean> {
    const d = await db()
    const id = `${surah}:${ayah}`
    const existing = await d.get('bookmarks', id)
    if (existing) await d.delete('bookmarks', id)
    else await d.put('bookmarks', { id, surah, ayah, createdAt: Date.now() })
    notifyChange('bookmarks')
    return !existing
  },
}

export const notes = {
  async all(): Promise<Note[]> {
    return (await (await db()).getAll('notes')).sort((a, b) => b.updatedAt - a.updatedAt)
  },
  async forAyah(surah: number, ayah: number): Promise<Note[]> {
    return (await db()).getAllFromIndex('notes', 'by_ayah', [surah, ayah])
  },
  async save(n: Omit<Note, 'createdAt' | 'updatedAt'> & { createdAt?: number }) {
    const now = Date.now()
    // المتصفحات ترفض مفتاحًا قيمته undefined صراحةً؛ نحذف الحقل ليُولَّد المفتاح تلقائيًا
    const { id, ...rest } = n
    const row: Note = { ...rest, createdAt: n.createdAt ?? now, updatedAt: now }
    if (id !== undefined) row.id = id
    await (await db()).put('notes', row)
    notifyChange('notes')
  },
  async remove(id: number) {
    await (await db()).delete('notes', id)
    notifyChange('notes')
  },
}

export const memo = {
  async all(): Promise<MemoSegment[]> {
    return (await db()).getAll('memo')
  },
  async add(segs: Omit<MemoSegment, 'id'>[]) {
    const d = await db()
    const tx = d.transaction('memo', 'readwrite')
    for (const s of segs) await tx.store.add(s as MemoSegment)
    await tx.done
    notifyChange('memo')
  },
  async put(s: MemoSegment) {
    await (await db()).put('memo', s)
    notifyChange('memo')
  },
  async remove(id: number) {
    await (await db()).delete('memo', id)
    notifyChange('memo')
  },
  async log(entry: Omit<MemoLog, 'id'>) {
    await (await db()).add('memoLog', entry as MemoLog)
    notifyChange('memoLog')
  },
  async logs(): Promise<MemoLog[]> {
    return (await db()).getAll('memoLog')
  },
}

export const reading = {
  async log(entry: Omit<ReadLog, 'id' | 'at'>) {
    await (await db()).add('readLog', { ...entry, at: Date.now() } as ReadLog)
    notifyChange('readLog')
  },
  async all(): Promise<ReadLog[]> {
    return (await db()).getAll('readLog')
  },
  async forDay(date: string): Promise<ReadLog[]> {
    return (await db()).getAllFromIndex('readLog', 'by_date', date)
  },
}

export const adhkarLog = {
  async complete(date: string, category: string) {
    await (await db()).add('adhkarLog', { date, category, at: Date.now() } as AdhkarLog)
    notifyChange('adhkarLog')
  },
  async all(): Promise<AdhkarLog[]> {
    return (await db()).getAll('adhkarLog')
  },
  async forDay(date: string): Promise<AdhkarLog[]> {
    return (await db()).getAllFromIndex('adhkarLog', 'by_date', date)
  },
}

export const favorites = {
  async all(): Promise<Favorite[]> {
    return (await db()).getAll('favorites')
  },
  async toggle(kind: Favorite['kind'], itemId: string): Promise<boolean> {
    const d = await db()
    const id = `${kind}:${itemId}`
    const existing = await d.get('favorites', id)
    if (existing) await d.delete('favorites', id)
    else await d.put('favorites', { id, kind, itemId, createdAt: Date.now() })
    notifyChange('favorites')
    return !existing
  },
}

export const listening = {
  async log(reciter: string, surah: number, ayah: number, date: string) {
    await (await db()).add('listenLog', { reciter, surah, ayah, date, at: Date.now() })
    notifyChange('listenLog')
  },
  async all() {
    return (await db()).getAll('listenLog')
  },
}
