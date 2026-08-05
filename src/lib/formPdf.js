// Doldurulmuş bir formun PDF çıktısı.
//
// Hem doldurma ekranı (henüz kaydedilmemiş form) hem Kayıtlı Yanıtlar ekranı
// (localStorage'dan okunan kayıt) aynı çıktıyı üretmeli, bu yüzden mantık tek
// yerde. formEngine.js'in aksine burası saf değil: i18n'i doğrudan içeri
// alıyor çünkü ürettiği şey zaten kullanıcıya gösterilen metin.
//
// jspdf/jspdf-autotable ağır kütüphaneler — çağrı anında lazy-load edilir
// (CustomReport.vue'daki export deseniyle aynı).

import { QUESTION_TYPES } from '../data/questionTypes.js'
import { flatQuestions, formatAnswer } from './formEngine.js'
import { addPdfLogo } from './pdfBrand.js'
import { t } from './i18n.js'

// jsPDF'in gömülü fontları cp1252 kodlar: ç/ö/ü/İ çalışır ama ş/ğ/ı bozulur.
// Tam çözüm TTF gömmek olurdu (~300KB base64); rapor tarafı da gömmediği için
// aynı yolu izleyip sadece sorunlu harfleri sadeleştiriyoruz.
const PDF_MAP = { ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I' }
const pdfSafe = (s) => String(s ?? '').replace(/[şŞğĞıİ]/g, (c) => PDF_MAP[c])

const pad = (n) => String(n).padStart(2, '0')

/** `<formKey>-2026-08-04` — dosya adı olarak güvenli, tarihe göre sıralanabilir. */
export function pdfFileName(formKey, date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${formKey}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * @param {Object} form    form şeması
 * @param {Object} answers cevap haritası (Date veya ISO string olabilir)
 * @param {Object} [opts]
 * @param {number|null} [opts.score]    yüzde; null ise skor satırı basılmaz
 * @param {Date|string} [opts.savedAt]  başlık altındaki zaman damgası
 * @param {string} [opts.fileName]      uzantısız dosya adı
 */
export async function exportFormPdf(form, answers, opts = {}) {
  const { score = null, savedAt = new Date(), fileName = pdfFileName(form.key) } = opts
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const margin = 14

  await addPdfLogo(doc, { margin })

  doc.setFontSize(14)
  doc.text(pdfSafe(t(form.titleKey)), margin, 16)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(pdfSafe(new Date(savedAt).toLocaleString()), margin, 22)
  if (score != null) {
    doc.text(pdfSafe(`${t('frm.score')}: ${score.toFixed(0)}%`), margin, 27)
  }
  doc.setTextColor(0)

  // Medya alanları tabloya girmez; imzalar altta görsel olarak basılır.
  const body = []
  for (const section of form.sections) {
    for (const q of section.questions) {
      if (QUESTION_TYPES[q.type]?.answerless) continue
      if (q.type === 'photo' || q.type === 'signature') continue
      body.push([
        pdfSafe(t(section.titleKey)),
        pdfSafe(t(q.labelKey)),
        pdfSafe(formatAnswer(q, answers[q.key], t)),
      ])
    }
  }

  autoTable(doc, {
    startY: score != null ? 32 : 27,
    head: [
      [pdfSafe(t('frm.pdf.section')), pdfSafe(t('frm.pdf.question')), pdfSafe(t('frm.pdf.answer'))],
    ],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 78 } },
  })

  let y = doc.lastAutoTable.finalY + 8
  for (const q of flatQuestions(form)) {
    if (q.type !== 'signature' || !answers[q.key]) continue
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(9)
    doc.text(pdfSafe(t(q.labelKey)), margin, y)
    doc.addImage(answers[q.key], 'PNG', margin, y + 2, 60, 24)
    y += 34
  }

  doc.save(`${fileName}.pdf`)
}
