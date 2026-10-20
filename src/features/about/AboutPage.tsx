import { PageHead } from '../../components/Common'
import { DEDICATION_PARAGRAPHS, DEDICATION_TITLE, FREE_PROMISE } from '../../content/dedication'
import { useQuran } from '../../hooks'

export function AboutPage() {
  const { data } = useQuran()
  const [basmala, ...rest] = DEDICATION_PARAGRAPHS
  return (
    <>
      <PageHead title={DEDICATION_TITLE} />
      <article className="card dedication-page" style={{ maxWidth: 820, margin: '0 auto' }}>
        <p className="basmala">{basmala}</p>
        {rest.map((p, i) => <p key={i}>{p}</p>)}
      </article>

      <section className="card" style={{ maxWidth: 820, margin: '1rem auto 0' }}>
        <h2>مجاني بالكامل</h2>
        <ul>{FREE_PROMISE.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>

      <section className="card" style={{ maxWidth: 820, margin: '1rem auto 0' }}>
        <h2>مصادر المحتوى والتحقق</h2>
        <ul className="small">
          <li><strong>النص القرآني:</strong> الرسم العثماني برواية حفص عن عاصم من «موسوعة القرآن الكريم» (QuranEnc)، المعتمد على نص مجمع الملك فهد لطباعة المصحف الشريف، عبر حزمة quran-json 3.1.2 (رخصة CC BY-SA 4.0). يتحقق التطبيق آليًا من عدد السور (114) والآيات (6236) وتسلسلها، ويقارنها بمصدر مستقل (quran-meta).{data && <> البصمة: <code dir="ltr">{data.meta.source.sha256.slice(0, 16)}…</code></>}</li>
          <li><strong>التفسير:</strong> التفسير الميسر (مجمع الملك فهد)، والمختصر في التفسير، وتفسير السعدي، وابن كثير، والبغوي، والميسر في غريب القرآن — عبر مستودع tafsir_api المفتوح، يُحمَّل عند الطلب ولا يُضمَّن في التطبيق.</li>
          <li><strong>الأذكار والأدعية:</strong> مختارة من الأذكار الثابتة كما في «حصن المسلم» للشيخ سعيد بن وهف القحطاني رحمه الله، مع ذكر التخريج، والآيات تُعرض من المصحف المعتمد.</li>
          <li><strong>الترجمة الإنجليزية:</strong> Saheeh International عبر Tanzil.net (مضمّنة في quran-json)، متحقق من مطابقة ترتيبها للمصحف.</li>
          <li><strong>التقويم الهجري:</strong> تقويم أم القرى المدمج في النظام، مع تعديل يدوي لاختلاف الرؤية.</li>
          <li><strong>التلاوات:</strong> مشروع EveryAyah (everyayah.com)، ومصدر بديل تلقائي Islamic Network (cdn.islamic.network) — تُبث مباشرة، ويُخزَّن ما ينزّله المستخدم على جهازه فقط.</li>
          <li><strong>مواقيت الصلاة:</strong> مكتبة adhan مفتوحة المصدر. <strong>المدن:</strong> GeoNames (CC BY 4.0).</li>
        </ul>
        <p className="small muted">إن لاحظت خطأً في أي محتوى فنرجو التنبيه عليه لتصحيحه. المحتوى الديني المكتوب (الأذكار والدروس) يحتاج إلى مراجعة متخصص شرعي قبل النشر العام.</p>
      </section>
      <p className="small muted" style={{ textAlign: 'center', marginTop: '1rem' }}>رفيق المسلم — الإصدار 0.5.0</p>
    </>
  )
}
