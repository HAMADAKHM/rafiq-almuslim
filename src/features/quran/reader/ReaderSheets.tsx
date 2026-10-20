import { useState } from 'react'
import { Sheet } from '../../../components/Sheet'
import { TafsirPanel } from '../../learn/TafsirPanel'
import { NoteEditor } from '../NoteEditor'
import { AyahSheet } from '../AyahSheet'
import type { QuranData } from '../../../services/quran'

export type AyahTarget = { surah: number; ayah: number } | null

/** الأوراق المشتركة في القارئ: خيارات الآية، والتفسير، والملاحظة */
export function useReaderSheets() {
  const [actions, setActions] = useState<AyahTarget>(null)
  const [tafsir, setTafsir] = useState<AyahTarget>(null)
  const [note, setNote] = useState<AyahTarget>(null)
  return { actions, setActions, tafsir, setTafsir, note, setNote }
}

export function ReaderSheets({ data, s, onMarkRead }: { data: QuranData; s: ReturnType<typeof useReaderSheets>; onMarkRead?: (surah: number, ayah: number) => void }) {
  const name = (n: number) => data.meta.surahs[n - 1].name
  return (
    <>
      {s.actions && (
        <AyahSheet data={data} surah={s.actions.surah} ayah={s.actions.ayah} onClose={() => s.setActions(null)}
          onTafsir={(a) => s.setTafsir({ surah: s.actions!.surah, ayah: a })}
          onNote={(a) => s.setNote({ surah: s.actions!.surah, ayah: a })}
          onMarkRead={onMarkRead ? (a) => onMarkRead(s.actions!.surah, a) : undefined} />
      )}
      <Sheet open={!!s.tafsir} onClose={() => s.setTafsir(null)} title={s.tafsir ? `تفسير سورة ${name(s.tafsir.surah)}: ${s.tafsir.ayah}` : 'التفسير'}>
        {s.tafsir && <TafsirPanel key={`${s.tafsir.surah}:${s.tafsir.ayah}`} surah={s.tafsir.surah} ayah={s.tafsir.ayah} />}
      </Sheet>
      <Sheet open={!!s.note} onClose={() => s.setNote(null)} title={s.note ? `ملاحظة على ${name(s.note.surah)}: ${s.note.ayah}` : 'ملاحظة'}>
        {s.note && <NoteEditor surah={s.note.surah} ayah={s.note.ayah} onClose={() => s.setNote(null)} />}
      </Sheet>
    </>
  )
}
