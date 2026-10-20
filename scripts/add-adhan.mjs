#!/usr/bin/env node
// إضافة صوت أذان مدمج من تسجيل يملك صاحب المشروع حق استخدامه.
// الاستخدام:
//   node scripts/add-adhan.mjs <ملف-الصوت> --id makkah --name "أذان الحرم المكي" [--muezzin "..."] --source "..." --license "..."
// يُنتج (يحتاج ffmpeg):
//   public/adhan_<id>.mp3                       الأذان كاملًا (داخل التطبيق والويب)
//   android/app/src/main/res/raw/adhan_<id>.mp3 صوت قناة الإشعار في Android
//   public/adhan_<id>_ios.caf                   مقطع ≤ 29 ثانية لإشعارات iOS (حد النظام 30 ثانية)
// ويحدّث src/content/adhan-voices.json.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const input = args[0]
const opt = (k) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : undefined }
const id = opt('id'), name = opt('name'), source = opt('source'), license = opt('license'), muezzin = opt('muezzin')

function fail(msg) { console.error('✗ ' + msg); process.exit(1) }
if (!input || !fs.existsSync(input)) fail('حدد ملف الصوت')
if (!id || !/^[a-z][a-z0-9_]{1,30}$/.test(id)) fail('--id: أحرف لاتينية صغيرة وأرقام وشرطة سفلية فقط (مثل makkah)')
if (!name) fail('--name مطلوب')
if (!source || !license) fail('--source و--license مطلوبان: لا يُضاف صوت دون مصدر وإذن استخدام معروفين')

const file = `adhan_${id}.mp3`
const iosFile = `adhan_${id}_ios.caf`
const outWeb = path.join(root, 'public', file)
const outRaw = path.join(root, 'android/app/src/main/res/raw', file)
const outIos = path.join(root, 'public', iosFile)
fs.mkdirSync(path.dirname(outRaw), { recursive: true })

const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' })
// تطبيع مستوى الصوت، وقناة واحدة بجودة كافية للصوت البشري مع حجم مناسب
ff(['-i', input, '-af', 'loudnorm=I=-16:TP=-1.5', '-ac', '1', '-ar', '44100', '-b:a', '96k', outWeb])
fs.copyFileSync(outWeb, outRaw)
ff(['-i', outWeb, '-t', '29', '-af', 'afade=t=out:st=27:d=2', '-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le', outIos])

const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outWeb]).toString().trim())
const catalogPath = path.join(root, 'src/content/adhan-voices.json')
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).filter((v) => v.id !== id)
catalog.push({ id, name, ...(muezzin ? { muezzin } : {}), source, license, durationSec: Math.round(dur), file, iosFile })
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n')
console.log(`✓ أُضيف «${name}» (${Math.round(dur)} ثانية): ${file}, ${iosFile}`)
