// يحزم شاشة التلفاز تطبيقًا لتلفزيونات Samsung (Tizen): dist-tizen/RafiqAlMuslim-Samsung.wgt
// الحزمة غير موقّعة: تُوقَّع وتُثبَّت من Tizen Studio (Certificate Manager) على تلفاز في وضع المطوّر.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const version = pkg.version.split('-')[0] // Tizen يقبل أرقامًا فقط: 1.0.0
const out = 'dist-tizen'
const dir = `${out}/pkg`
rmSync(out, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })
cpSync('dist-tv', dir, { recursive: true })
rmSync(`${dir}/index.html`, { force: true })

// واجهة Samsung (webapis) لمنع شاشة التوقف أثناء عرض المواقيت — متاحة على التلفاز فقط
const html = readFileSync(`${dir}/tv.html`, 'utf8').replace('<head>', '<head>\n    <script src="$WEBAPIS/webapis/webapis.js"></script>')
writeFileSync(`${dir}/tv.html`, html)

writeFileSync(`${dir}/config.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets" id="http://rafiqalmuslim.org/tv" version="${version}" viewmodes="maximized">
    <tizen:application id="RafiqTV001.RafiqAlMuslim" package="RafiqTV001" required_version="2.3"/>
    <content src="tv.html"/>
    <feature name="http://tizen.org/feature/screen.size.all"/>
    <icon src="icon-512.png"/>
    <name>شاشة رفيق المسلم</name>
    <description>مواقيت الصلاة والأذان والقراءة — صدقة جارية عن روح المرحوم الحاج قصي بديع خلفه «أبو محمد»</description>
    <tizen:profile name="tv-samsung"/>
    <tizen:privilege name="http://tizen.org/privilege/internet"/>
    <tizen:privilege name="http://developer.samsung.com/privilege/productinfo"/>
    <tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>
    <tizen:setting screen-orientation="landscape" context-menu="disable" background-support="enable" encryption="disable" install-location="auto" hwkey-event="enable"/>
    <access origin="*" subdomains="true"/>
</widget>
`)
execSync(`cd ${dir} && zip -qr -X ../RafiqAlMuslim-Samsung.wgt .`)
console.log(`${out}/RafiqAlMuslim-Samsung.wgt`)
