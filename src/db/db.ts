// قاعدة البيانات المحلية (IndexedDB) — كل بيانات المستخدم تبقى على جهازه.
// لا حسابات ولا خوادم. التصميم يسمح بإضافة مزامنة سحابية لاحقًا عبر src/sync.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SrsState } from '../services/srs'

export interface Bookmark { id: string; surah: number; ayah: number; createdAt: number; label?: string }
export interface Note { id?: number; surah: number; ayah: number; text: string; createdAt: number; updatedAt: number }
export interface MemoSegment extends SrsState {
  id?: number
  surah: number
  from: number
  to: number
  createdAt: number
  lastReviewed?: number
  paused?: boolean
}
export interface MemoLog { id?: number; segmentId: number; date: string; grade: number; kind: 'learn' | 'review'; at: number }
export interface ReadLog { id?: number; date: string; surah: number; from: number; to: number; ayahs: number; pages: number[]; at: number }
export interface AdhkarLog { id?: number; date: string; category: string; at: number }
export interface Favorite { id: string; kind: 'dhikr' | 'dua' | 'ayah' | 'hadith'; itemId: string; createdAt: number }
export interface ListenLog { id?: number; date: string; reciter: string; surah: number; ayah: number; at: number }

interface CompanionDB extends DBSchema {
  kv: { key: string; value: unknown }
  bookmarks: { key: string; value: Bookmark }
  notes: { key: number; value: Note; indexes: { by_ayah: [number, number] } }
  memo: { key: number; value: MemoSegment; indexes: { by_due: string } }
  memoLog: { key: number; value: MemoLog; indexes: { by_date: string } }
  readLog: { key: number; value: ReadLog; indexes: { by_date: string } }
  adhkarLog: { key: number; value: AdhkarLog; indexes: { by_date: string } }
  favorites: { key: string; value: Favorite }
  listenLog: { key: number; value: ListenLog; indexes: { by_date: string } }
}

export type StoreName = 'kv' | 'bookmarks' | 'notes' | 'memo' | 'memoLog' | 'readLog' | 'adhkarLog' | 'favorites' | 'listenLog'
export const STORES: StoreName[] = ['kv', 'bookmarks', 'notes', 'memo', 'memoLog', 'readLog', 'adhkarLog', 'favorites', 'listenLog']

export const DB_NAME = 'islamic-companion'
export const DB_VERSION = 1

let dbp: Promise<IDBPDatabase<CompanionDB>> | null = null

export function db(): Promise<IDBPDatabase<CompanionDB>> {
  if (!dbp) {
    dbp = openDB<CompanionDB>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        d.createObjectStore('kv')
        d.createObjectStore('bookmarks', { keyPath: 'id' })
        d.createObjectStore('notes', { keyPath: 'id', autoIncrement: true }).createIndex('by_ayah', ['surah', 'ayah'])
        d.createObjectStore('memo', { keyPath: 'id', autoIncrement: true }).createIndex('by_due', 'due')
        d.createObjectStore('memoLog', { keyPath: 'id', autoIncrement: true }).createIndex('by_date', 'date')
        d.createObjectStore('readLog', { keyPath: 'id', autoIncrement: true }).createIndex('by_date', 'date')
        d.createObjectStore('adhkarLog', { keyPath: 'id', autoIncrement: true }).createIndex('by_date', 'date')
        d.createObjectStore('favorites', { keyPath: 'id' })
        d.createObjectStore('listenLog', { keyPath: 'id', autoIncrement: true }).createIndex('by_date', 'date')
      },
    })
    // نطلب تخزينًا دائمًا حتى لا يحذف المتصفح البيانات عند امتلاء المساحة
    navigator.storage?.persist?.().catch(() => {})
  }
  return dbp
}

/** للاختبارات فقط */
export async function resetDbForTests() {
  if (dbp) (await dbp).close()
  dbp = null
}
