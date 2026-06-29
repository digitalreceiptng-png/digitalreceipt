import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// â”€â”€ Colours â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GREEN      = rgb(0.051, 0.42, 0.118)   // #0d6b1e
const GREEN_LIGHT= rgb(0.91, 0.98, 0.925)    // #e8f5ec
const INK        = rgb(0.102, 0.102, 0.102)  // #1a1a1a
const MUTED      = rgb(0.42, 0.384, 0.322)   // #6b6251
const BORDER     = rgb(0.831, 0.773, 0.627)  // #d4c5a0
const BG         = rgb(0.973, 0.961, 0.937)  // #f8f5ef
const RED        = rgb(0.863, 0.149, 0.149)  // #dc2626
const WHITE      = rgb(1, 1, 1)

// â”€â”€ Page constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const W = 595.28   // A4 width  (pt)
const H = 841.89   // A4 height (pt)
const ML = 50      // margin left
const MR = 50      // margin right
const CW = W - ML - MR  // content width

// â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let pdf, pages, fonts
let page, y

function newPage() {
  page = pdf.addPage([W, H])
  pages.push(page)
  y = H - 50
  // Subtle background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG })
  // Top bar
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: GREEN })
  // Bottom bar
  page.drawRectangle({ x: 0, y: 0, width: W, height: 4, color: GREEN })
  // Page number
  const pn = String(pages.length)
  page.drawText(pn, { x: W / 2 - 4, y: 14, size: 8, font: fonts.regular, color: MUTED })
  page.drawText('DigitalReceipt.ng â€” Product Requirements Document', {
    x: ML, y: 14, size: 7, font: fonts.regular, color: MUTED,
  })
  y = H - 52
}

function checkY(needed = 20) {
  if (y < 60 + needed) newPage()
}

function gap(n = 10) { y -= n }

function drawText(text, { size = 10, font: f, color = INK, x = ML, maxWidth = CW, align = 'left' } = {}) {
  const fnt = f || fonts.regular
  const actualX = align === 'center' ? W / 2 : x
  page.drawText(text, {
    x: actualX, y, size, font: fnt, color,
    ...(align === 'center' ? { x: W / 2 - fnt.widthOfTextAtSize(text, size) / 2 } : {}),
  })
  y -= size + 4
}

function drawWrapped(text, { size = 10, font: f, color = INK, x = ML, width = CW, lineGap = 3 } = {}) {
  const fnt = f || fonts.regular
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (fnt.widthOfTextAtSize(test, size) > width && line) {
      checkY(size + lineGap + 2)
      page.drawText(line, { x, y, size, font: fnt, color })
      y -= size + lineGap
      line = word
    } else {
      line = test
    }
  }
  if (line) {
    checkY(size + lineGap + 2)
    page.drawText(line, { x, y, size, font: fnt, color })
    y -= size + lineGap
  }
}

function sectionHeader(title, subtitle = '') {
  checkY(60)
  gap(14)
  // Green bar
  page.drawRectangle({ x: ML, y: y - 2, width: 4, height: subtitle ? 38 : 26, color: GREEN })
  page.drawText(title.toUpperCase(), {
    x: ML + 12, y: y + (subtitle ? 16 : 8),
    size: 13, font: fonts.bold, color: GREEN,
  })
  if (subtitle) {
    page.drawText(subtitle, { x: ML + 12, y: y, size: 9, font: fonts.regular, color: MUTED })
    y -= 6
  }
  y -= subtitle ? 44 : 32
  // Underline
  page.drawLine({ start: { x: ML, y: y + 4 }, end: { x: W - MR, y: y + 4 }, thickness: 0.5, color: BORDER })
  gap(10)
}

function bullet(label, text, { indent = 0 } = {}) {
  const bx = ML + indent
  const tw = CW - indent - 10
  checkY(16)
  // Dot
  page.drawCircle({ x: bx + 5, y: y + 3, size: 2.5, color: GREEN })
  if (label) {
    const lw = fonts.bold.widthOfTextAtSize(`${label}: `, 9)
    page.drawText(`${label}: `, { x: bx + 13, y, size: 9, font: fonts.bold, color: INK })
    drawWrapped(text, { size: 9, x: bx + 13 + lw, width: tw - lw - 6, color: MUTED })
    y += 9 + 4  // undo the wrap's last line advance, we already moved
    y -= 9 + 5
  } else {
    drawWrapped(text, { size: 9, x: bx + 13, width: tw, color: INK })
    y += 5
    y -= 5
  }
  gap(2)
}

function tableRow(cells, widths, isHeader = false) {
  checkY(20)
  const rowH = 18
  const fnt = isHeader ? fonts.bold : fonts.regular
  const bgColor = isHeader ? GREEN : (pages.indexOf(page) % 2 === 0 ? WHITE : GREEN_LIGHT)
  let cx = ML
  // Background
  page.drawRectangle({ x: ML, y: y - 4, width: CW, height: rowH, color: isHeader ? GREEN : WHITE, opacity: isHeader ? 1 : 0.5 })
  cells.forEach((cell, i) => {
    const cw = widths[i]
    const clr = isHeader ? WHITE : INK
    const words = cell.split(' ')
    let line = ''
    let ty = y + 4
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (fnt.widthOfTextAtSize(test, 8) > cw - 6) {
        page.drawText(line, { x: cx + 3, y: ty, size: 8, font: fnt, color: clr })
        ty -= 10
        line = word
      } else {
        line = test
      }
    }
    if (line) page.drawText(line, { x: cx + 3, y: ty, size: 8, font: fnt, color: clr })
    cx += cw
  })
  // Bottom border
  page.drawLine({ start: { x: ML, y: y - 4 }, end: { x: W - MR, y: y - 4 }, thickness: 0.3, color: BORDER })
  y -= rowH
}

function infoBox(text, { color = GREEN_LIGHT, borderColor = GREEN } = {}) {
  checkY(40)
  gap(4)
  const lines = Math.ceil(text.length / 80)
  const boxH = lines * 13 + 16
  page.drawRectangle({ x: ML, y: y - boxH + 10, width: CW, height: boxH, color, borderColor, borderWidth: 1, borderOpacity: 0.6 })
  page.drawRectangle({ x: ML, y: y - boxH + 10, width: 4, height: boxH, color: borderColor })
  drawWrapped(text, { size: 9, x: ML + 12, width: CW - 20, color: INK })
  gap(10)
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  MAIN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generate() {
  pdf   = await PDFDocument.create()
  pages = []
  fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold:    await pdf.embedFont(StandardFonts.HelveticaBold),
    italic:  await pdf.embedFont(StandardFonts.HelveticaOblique),
  }

  pdf.setTitle('DigitalReceipt.ng â€” Product Requirements Document')
  pdf.setAuthor('Ayodele Victor Olaiya')
  pdf.setSubject('PRD v1.0 â€” June 2026')
  pdf.setCreator('DigitalReceipt.ng')

  // â”€â”€ COVER PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  // Hero band
  page.drawRectangle({ x: 0, y: H - 260, width: W, height: 260, color: GREEN })

  // Logo circle
  page.drawCircle({ x: ML + 28, y: H - 60, size: 22, color: WHITE, opacity: 0.15 })
  page.drawText('DR', { x: ML + 18, y: H - 67, size: 14, font: fonts.bold, color: WHITE })
  page.drawText('DigitalReceipt.ng', { x: ML + 58, y: H - 63, size: 14, font: fonts.bold, color: WHITE })
  page.drawText('Verified Receipts for Every Nigerian', { x: ML + 58, y: H - 77, size: 9, font: fonts.regular, color: rgb(0.8,0.95,0.84) })

  page.drawText('PRODUCT REQUIREMENTS', { x: ML, y: H - 140, size: 28, font: fonts.bold, color: WHITE })
  page.drawText('DOCUMENT', { x: ML, y: H - 175, size: 28, font: fonts.bold, color: rgb(0.7, 0.93, 0.76) })

  page.drawText('Version 1.0  Â-  June 2026  Â-  Confidential', { x: ML, y: H - 215, size: 10, font: fonts.regular, color: rgb(0.8,0.95,0.84) })

  y = H - 290

  gap(18)
  drawText('PREPARED BY', { size: 8, font: fonts.bold, color: MUTED })
  gap(-4)
  drawText('Ayodele Victor Olaiya', { size: 13, font: fonts.bold, color: INK })
  drawText('Founder & Product Owner â€” DigitalReceipt.ng', { size: 9, color: MUTED })

  gap(20)
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: BORDER })
  gap(20)

  const meta = [
    ['Document Status', 'Active / In Development'],
    ['Platform URL', 'https://digitalreceipt.ng'],
    ['Tech Stack', 'Next.js 16, Supabase, Paystack, Resend, Vercel'],
    ['Target Market', 'Nigeria (Federal Republic)'],
    ['Document Owner', 'Ayodele Victor Olaiya <ayvicola@gmail.com>'],
  ]
  meta.forEach(([k, v]) => {
    page.drawText(k, { x: ML, y, size: 9, font: fonts.bold, color: INK })
    page.drawText(v, { x: ML + 160, y, size: 9, font: fonts.regular, color: MUTED })
    y -= 16
  })

  gap(30)
  infoBox('This document describes the product vision, feature set, technical architecture, user flows, security posture, and roadmap for DigitalReceipt.ng â€” Nigeria\'s first digital receipt and verification platform. It is intended for internal use by the product team, developers, and potential investors or partners.')

  // â”€â”€ TABLE OF CONTENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  y = H - 70
  page.drawText('TABLE OF CONTENTS', { x: ML, y, size: 16, font: fonts.bold, color: GREEN })
  y -= 30
  page.drawLine({ start: { x: ML, y: y + 10 }, end: { x: W - MR, y: y + 10 }, thickness: 0.5, color: BORDER })

  const toc = [
    ['1', 'Executive Summary', '3'],
    ['2', 'Problem Statement', '3'],
    ['3', 'Product Vision & Goals', '4'],
    ['4', 'Target Users', '4'],
    ['5', 'Core Features', '5'],
    ['5.1', 'Receipt Generation', '5'],
    ['5.2', 'Receipt Tiers', '5'],
    ['5.3', 'Receipt Verification', '6'],
    ['5.4', 'Wallet & Payments', '6'],
    ['5.5', 'Email & SMS Delivery', '6'],
    ['5.6', 'Identity Verification (KYC)', '7'],
    ['5.7', 'Installment Schedules', '7'],
    ['5.8', 'Payment Reminders', '7'],
    ['5.9', 'Staff Management', '8'],
    ['5.10','Sub-accounts (Company Profiles)', '8'],
    ['5.11','Receipt Groups & Export', '8'],
    ['5.12','Free Invoice Generator', '9'],
    ['6', 'Admin Console', '9'],
    ['7', 'Security Architecture', '10'],
    ['8', 'Technical Architecture', '11'],
    ['9', 'Integrations', '12'],
    ['10', 'Pricing Model', '12'],
    ['11', 'Non-Functional Requirements', '13'],
    ['12', 'Product Roadmap', '13'],
    ['13', 'Success Metrics (KPIs)', '14'],
    ['14', 'Constraints & Assumptions', '14'],
  ]

  toc.forEach(([num, title, pg]) => {
    const isMain = num.length <= 1 || !num.includes('.')
    const fnt = isMain ? fonts.bold : fonts.regular
    const clr = isMain ? INK : MUTED
    const indent = isMain ? 0 : 14
    page.drawText(`${num}.`, { x: ML + indent, y, size: 9, font: fnt, color: GREEN })
    page.drawText(title, { x: ML + indent + 22, y, size: 9, font: fnt, color: clr })
    page.drawText(pg, { x: W - MR - 10, y, size: 9, font: fnt, color: MUTED })
    // Dots
    const startX = ML + indent + 22 + fonts.regular.widthOfTextAtSize(title, 9) + 6
    const endX = W - MR - 20
    let dx = startX
    while (dx < endX) { page.drawText('.', { x: dx, y, size: 9, font: fonts.regular, color: rgb(0.8,0.8,0.8) }); dx += 5 }
    y -= isMain ? 18 : 14
    if (y < 80) { newPage(); y = H - 70 }
  })

  // â”€â”€ 1. EXECUTIVE SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  sectionHeader('1. Executive Summary')
  drawWrapped('DigitalReceipt.ng is a Nigerian SaaS platform that enables individuals, businesses, schools, hospitals, landlords, freelancers, retailers, and government agencies to generate tamper-proof, verifiable digital receipts. Every receipt issued on the platform carries a unique identifier and QR code (on premium tiers) that the recipient can use to verify its authenticity online â€” eliminating receipt fraud and building financial trust across Nigeria.', { size: 10 })
  gap(8)
  drawWrapped('The platform operates on a tiered, wallet-funded model. Users fund their wallet via Paystack and spend credits to issue receipts. A generous free tier ensures accessibility while premium tiers unlock advanced features such as QR codes, bulk export, identity verification, and installment tracking.', { size: 10 })
  gap(8)
  infoBox('Core value proposition: Any Nigerian â€” whether a market trader or a government ministry â€” can issue a receipt that their customer can verify in seconds by scanning a QR code or searching a verification code online.')

  // â”€â”€ 2. PROBLEM STATEMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionHeader('2. Problem Statement')
  drawWrapped('Nigeria\'s informal and formal economies both suffer from receipt fraud and financial opacity:', { size: 10, font: fonts.bold })
  gap(6)
  bullet('', 'Fake receipts are easily forged with off-the-shelf tools â€” costing businesses and consumers money.')
  bullet('', 'Landlords issue handwritten rent receipts with no verifiable record, enabling disputes.')
  bullet('', 'Schools and hospitals cannot prove fee payments were legitimate, leading to student/patient disputes.')
  bullet('', 'Freelancers have no professional way to issue verifiable invoices and receipts to clients.')
  bullet('', 'Government agencies issue receipts that are frequently duplicated or forged by bad actors.')
  bullet('', 'SMEs lack affordable tools to track partial payments, installment plans, and outstanding balances.')
  gap(8)
  drawWrapped('Existing solutions (QuickBooks, Wave, Zoho) are not tailored to the Nigerian market, lack local payment rails, do not support NGN wallet-based billing, and have no receipt verification infrastructure.', { size: 10 })

  // â”€â”€ 3. PRODUCT VISION & GOALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionHeader('3. Product Vision & Goals')
  drawText('Vision', { size: 11, font: fonts.bold, color: GREEN })
  gap(-2)
  drawWrapped('"To become the trusted digital receipt infrastructure for every Nigerian issuer â€” making financial transactions transparent, verifiable, and fraud-proof."', { size: 10, font: fonts.italic, color: MUTED })
  gap(10)
  drawText('Strategic Goals', { size: 11, font: fonts.bold })
  gap(4)
  bullet('G1', 'Achieve 10,000 registered issuers within 12 months of launch.')
  bullet('G2', 'Process 500,000 verified receipts in year one.')
  bullet('G3', 'Establish DigitalReceipt.ng as the de-facto verification standard for Nigerian receipts.')
  bullet('G4', 'Generate sustainable revenue through wallet top-ups and premium receipt tiers.')
  bullet('G5', 'Expand to support public API access enabling third-party platforms to issue verified receipts.')

  // â”€â”€ 4. TARGET USERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionHeader('4. Target Users')

  const personas = [
    ['Schools & Educational Institutions', 'Issue fee receipts, levies, uniform payments, and PTA dues with a verifiable trail that parents can confirm online.'],
    ['Hospitals & Clinics', 'Issue consultation, procedure, and pharmacy receipts that patients can verify â€” reducing billing disputes and insurance fraud.'],
    ['Landlords & Estate Managers', 'Issue rent, service charge, and caution fee receipts tied to a verifiable record â€” eliminating fake receipt disputes.'],
    ['Freelancers & Consultants', 'Issue professional receipts and invoices for services rendered, with optional instalment tracking.'],
    ['Retailers & SMEs', 'Issue sales receipts across a wide product catalogue with partial payment, balance tracking, and group management.'],
    ['Government Agencies', 'Issue tax, levy, fine, and permit receipts with a chain of verification that citizens can confirm independently.'],
    ['Buyers / Receipt Recipients', 'Verify any DigitalReceipt.ng receipt by entering the code on the website â€” no account required.'],
  ]

  personas.forEach(([name, desc]) => {
    checkY(50)
    gap(4)
    page.drawRectangle({ x: ML, y: y - 28, width: CW, height: 40, color: WHITE, borderColor: BORDER, borderWidth: 0.5 })
    page.drawRectangle({ x: ML, y: y + 8, width: CW, height: 4, color: GREEN_LIGHT })
    page.drawText(name, { x: ML + 10, y: y + 4, size: 9, font: fonts.bold, color: GREEN })
    y -= 14
    drawWrapped(desc, { size: 9, x: ML + 10, width: CW - 20, color: MUTED })
    gap(8)
  })

  // â”€â”€ 5. CORE FEATURES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  sectionHeader('5. Core Features')

  // 5.1
  drawText('5.1  Receipt Generation', { size: 11, font: fonts.bold, color: INK })
  gap(2)
  drawWrapped('Users generate receipts through a 5-step wizard: Type â†’ Customer â†’ Transaction â†’ Items â†’ Review.', { size: 10 })
  gap(4)
  bullet('Buyer details', 'Name, phone, email, address')
  bullet('Transaction info', 'Date, payment method, reference number, custom labels, notes')
  bullet('Line items', 'Description, quantity, unit price, total â€” with custom column labels')
  bullet('Financials', 'Subtotal, discount, tax (VAT), amount paid, balance due')
  bullet('Attachments', 'Up to 5 files (images/PDF) stored in Supabase Storage')
  bullet('Output', 'Unique identifier, receipt number, verify URL, downloadable PDF')
  gap(10)

  // 5.2
  drawText('5.2  Receipt Tiers', { size: 11, font: fonts.bold })
  gap(4)
  tableRow(['Tier', 'Cost', 'QR Code', 'Free Quota', 'Best For'], [80, 70, 70, 90, CW - 310], true)
  tableRow(['Silver', 'NGN 100', 'No', '5/month', 'Individuals & light use'], [80, 70, 70, 90, CW - 310])
  tableRow(['Gold', 'NGN 200', 'Yes', '-', 'SMEs & regular issuers'], [80, 70, 70, 90, CW - 310])
  tableRow(['Diamond', 'NGN 500', 'Yes', '-', 'Businesses & agencies'], [80, 70, 70, 90, CW - 310])
  tableRow(['Platinum', 'NGN 1,000', 'Yes', '-', 'High-volume issuers'], [80, 70, 70, 90, CW - 310])
  gap(14)

  // 5.3
  drawText('5.3  Receipt Verification', { size: 11, font: fonts.bold })
  gap(2)
  drawWrapped('Any person â€” with or without an account â€” can verify a receipt at digitalreceipt.ng/r/{identifier} or via the homepage search. The public verify page shows: seller name, buyer name, items, amount, date, and a VERIFIED/NOT FOUND status badge. Sensitive seller fields (NIN, RC number, phone) are never exposed on the public page.', { size: 10 })
  gap(10)

  // 5.4
  drawText('5.4  Wallet & Payments', { size: 11, font: fonts.bold })
  gap(2)
  bullet('Top-up', 'Users fund wallet via Paystack (card, bank transfer, USSD). Minimum top-up enforced.')
  bullet('Deduction', 'Wallet deducted atomically via Postgres RPC on receipt creation â€” no race conditions.')
  bullet('Idempotency', 'Paystack reference stored with unique index â€” duplicate webhooks are no-ops.')
  bullet('Balance check', 'Insufficient balance returns 402 with required/shortfall values for client to show top-up prompt.')
  bullet('Free quota', 'Silver receipts are free up to 5/month per user - tracked via monthly count query.')
  gap(10)

  // 5.5
  drawText('5.5  Email & SMS Delivery', { size: 11, font: fonts.bold })
  gap(2)
  bullet('Email', 'Receipt emailed to buyer via Resend â€” branded HTML email with seller name, receipt details, and verify link. Up to 5 recipients per send.')
  bullet('SMS', 'Verification link texted via Termii. â‚¦10 deducted per number. Owner wallet charged.')
  bullet('Free invoice email', 'Public free-invoice tool sends email â€” requires login, rate-limited to 5/hour per user.')
  gap(10)

  // 5.6
  checkY(80)
  drawText('5.6  Identity Verification (KYC)', { size: 11, font: fonts.bold })
  gap(2)
  drawWrapped('Users can verify their identity via NIN (National Identification Number) or BVN through QoreID. Upon successful verification, a session token is created. The user must submit this token when logging the verification result â€” preventing self-grant attacks. Verified users receive a "Verified Issuer" badge visible on their receipts.', { size: 10 })
  gap(10)

  // 5.7
  drawText('5.7  Installment Schedules', { size: 11, font: fonts.bold })
  gap(2)
  drawWrapped('For receipts with an outstanding balance, issuers can set up an installment schedule with named milestones, due dates, and amounts. Each installment can trigger automatic reminders via email or SMS. Overdue installments are highlighted in red across the dashboard and export.', { size: 10 })
  gap(10)

  // 5.8
  drawText('5.8  Payment Reminders', { size: 11, font: fonts.bold })
  gap(2)
  bullet('Manual', 'Send reminder immediately from the receipt detail page.')
  bullet('Scheduled', 'Set recurring reminder frequency: daily, every 3 days, weekly, biweekly, or monthly.')
  bullet('Auto-stop', 'Reminder automatically deactivates when balance_due reaches zero.')
  bullet('Cron', 'Server-side cron job processes due reminders daily â€” secured with CRON_SECRET bearer token.')
  gap(10)

  // 5.9
  drawText('5.9  Staff Management', { size: 11, font: fonts.bold })
  gap(2)
  drawWrapped('Business owners can invite staff members who can create receipts on their behalf. Staff permissions are granular:', { size: 10 })
  gap(4)
  bullet('can_create_receipts', 'Allow/deny receipt creation')
  bullet('can_view_all_receipts', 'View all receipts or only their own')
  bullet('Issued By', 'Each receipt records which staff member issued it')
  bullet('Staff portal', 'Staff log in normally and see the owner\'s receipts scoped to their permissions')
  gap(10)

  // 5.10
  newPage()
  drawText('5.10  Sub-Accounts (Company Profiles)', { size: 11, font: fonts.bold })
  gap(2)
  drawWrapped('Users managing multiple businesses can create sub-accounts, each with its own business name, RC number, and address. Switching the active sub-account scopes receipt creation and the dashboard view to that profile. Receipts store the sub_account_id for accurate segmentation.', { size: 10 })
  gap(10)

  // 5.11
  drawText('5.11  Receipt Groups & Export', { size: 11, font: fonts.bold })
  gap(2)
  bullet('Groups', 'Receipts can be organised into named, colour-coded groups (e.g. "Jan Rent", "School Fees Q1").')
  bullet('Bulk select', 'Select multiple receipts for group assignment.')
  bullet('PDF Export', 'Generates a print-ready PDF with all columns, coloured rows for overdue, status badges, financial summary, and expenditure breakdown. Paper size selectable: A4, Letter, Legal, A5.')
  bullet('CSV Export', 'Flat CSV with the same column set â€” suitable for accounting software import.')
  bullet('Custom labels', 'Column headers (e.g. "Receipt No." â†’ "Invoice No.", "Customer" â†’ "Patient") are editable per group and saved in localStorage.')
  gap(10)

  // 5.12
  drawText('5.12  Free Invoice Generator', { size: 11, font: fonts.bold })
  gap(2)
  drawWrapped('A public-facing free invoice tool at /free-invoice allows any user to create a one-time invoice without a paid receipt. Requires login. Emails the invoice HTML to a specified address. Rate-limited to 5 sends per hour per user.', { size: 10 })
  gap(10)

  // â”€â”€ 6. ADMIN CONSOLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionHeader('6. Admin Console')
  drawWrapped('A dedicated admin subdomain (admin.digitalreceipt.ng) provides platform-level management. Access requires a registered admin account in the admins table plus OTP 2FA sent to the admin email.', { size: 10 })
  gap(8)

  const adminModules = [
    ['Overview', 'Platform KPIs: total users, receipts, revenue, wallet balances, recent signups.'],
    ['Users', 'View all users, profile details, wallet balance, receipt count, subscription status. Soft-delete support.'],
    ['Receipts', 'Browse all receipts across all users. View, download PDF, filter by status/type.'],
    ['Identity Queue', 'Review KYC submissions. Approve or reject NIN/BVN verifications with audit trail.'],
    ['Subscriptions', 'Manage subscription plans, user plan assignments, and billing history.'],
    ['Support', 'Read and respond to support tickets. Status workflow: open â†’ in progress â†’ resolved â†’ closed. Email notification on status changes.'],
    ['Blog & Content', 'Create and manage blog posts and announcement banners shown on the homepage.'],
    ['Partners', 'Add, toggle active/inactive, and delete partner logos shown in the homepage scrolling ticker.'],
    ['Announcements', 'Create site-wide banners with expiry dates.'],
    ['Security Shield', 'View blocked IPs, security events, threat scores. One-click unblock.'],
    ['Audit Log', 'Immutable log of all significant platform events with actor, entity, and timestamp.'],
    ['Admin Users', 'Manage who has admin console access.'],
    ['System', 'Platform health, environment checks, and configuration.'],
  ]

  adminModules.forEach(([name, desc]) => {
    bullet(name, desc)
  })

  // â”€â”€ 7. SECURITY ARCHITECTURE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  sectionHeader('7. Security Architecture')

  drawText('Authentication', { size: 11, font: fonts.bold })
  gap(4)
  bullet('User auth', 'Supabase Auth â€” email/password + Google OAuth. New Google users redirected to complete profile.')
  bullet('Admin auth', 'Admins table check + SHA-256 hashed OTP 2FA with 5-attempt lockout and 10-minute TTL.')
  bullet('API keys', 'SHA-256 hashed, prefix-visible, per-user API keys for third-party integrations (in roadmap).')
  gap(10)

  drawText('Threat Protection â€” Sensitive Shield', { size: 11, font: fonts.bold })
  gap(2)
  drawWrapped('A middleware-level intrusion detection system runs on every request:', { size: 10 })
  gap(4)
  bullet('Detection', 'SQL injection, XSS, path traversal, command injection, scanner user-agents (sqlmap, nikto, nmap, etc.)')
  bullet('Scoring', 'Each threat pattern carries a score (6â€“20). Scores accumulate per IP in-memory.')
  bullet('Auto-block', 'IPs scoring â‰¥ 20 are blocked immediately, persisted to Supabase for 24 hours, and synced across server instances every 5 minutes.')
  bullet('Notification', 'Instant email alert to admin with IP, threat types, target path, score, and WAT timestamp.')
  bullet('Block page', 'Blocked IPs receive a branded 403 page instead of any application response.')
  gap(10)

  drawText('Data Security', { size: 11, font: fonts.bold })
  gap(4)
  bullet('RLS', 'Supabase Row Level Security enforced on all user-facing tables.')
  bullet('Service role', 'Admin client (service role) used server-side only â€” never exposed to the browser.')
  bullet('Wallet', 'Atomic Postgres RPCs (deduct_wallet, credit_wallet) prevent race conditions and double-spend.')
  bullet('KYC self-grant', 'identity/log endpoint requires a valid verify_sessions token â€” users cannot self-grant KYC.')
  bullet('PII protection', 'Public receipt verify API strips seller NIN, phone, RC number, and buyer PII from response.')
  bullet('OTP rate limit', 'Admin OTP send: 3 requests per 10 minutes per IP. OTP verify: 5 attempts before lockout.')
  bullet('Cron security', 'All cron routes require CRON_SECRET bearer token â€” undefined secret rejects all requests.')
  bullet('Email cap', 'Maximum 5 email recipients per receipt send to prevent abuse.')
  bullet('Free invoice', 'Requires login + 5/hour per-user rate limit to prevent spam.')
  gap(10)

  drawText('Audit & Compliance', { size: 11, font: fonts.bold })
  gap(4)
  bullet('Activity log', 'All significant actions logged to user_activities with actor, type, entity, and metadata.')
  bullet('Security events', 'All threat detections and blocked requests persisted to security_events table.')
  bullet('Receipt immutability', 'Issued receipts are append-only â€” status can change (cancelled, expired) but content cannot be edited.')

  // â”€â”€ 8. TECHNICAL ARCHITECTURE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  sectionHeader('8. Technical Architecture')

  const techStack = [
    ['Layer', 'Technology', 'Purpose'],
    ['Frontend', 'Next.js 16 (App Router)', 'SSR/SSG pages, API routes, middleware'],
    ['Styling', 'Tailwind CSS', 'Utility-first responsive design'],
    ['Database', 'Supabase (PostgreSQL)', 'All application data + RLS'],
    ['Auth', 'Supabase Auth + next-auth', 'Session management, Google OAuth'],
    ['Storage', 'Supabase Storage', 'Receipt attachments, partner logos, support files'],
    ['Payments', 'Paystack', 'Wallet top-up, webhook verification'],
    ['Email', 'Resend', 'Transactional emails â€” receipts, OTPs, alerts'],
    ['SMS', 'Termii', 'Receipt delivery, installment reminders'],
    ['PDF', '@react-pdf/renderer', 'Server-side PDF generation'],
    ['KYC', 'QoreID', 'NIN and BVN identity verification'],
    ['Deployment', 'Vercel', 'Edge-optimised global CDN'],
    ['Security', 'Custom Shield (middleware)', 'Real-time threat detection and IP blocking'],
  ]
  const tw2 = [110, 180, CW - 290]
  techStack.forEach((row, i) => tableRow(row, tw2, i === 0))
  gap(14)

  drawText('Key Architectural Decisions', { size: 11, font: fonts.bold })
  gap(4)
  bullet('Edge middleware', 'Shield runs as Vercel Edge middleware â€” zero cold start, sub-ms overhead per request.')
  bullet('Atomic wallet ops', 'Postgres RPCs ensure wallet balance never goes negative even under concurrent load.')
  bullet('Server components', 'Receipt lists, admin pages use React Server Components â€” no client-side data fetching for core views.')
  bullet('Incremental exports', 'Export fetches all receipts server-side at page load â€” export is instant for the user.')
  bullet('PDF inline/attachment', 'PDF route serves inline (for print) or as attachment (for download) based on ?print=1 param.')
  bullet('Paper size', 'PDF generation accepts ?size=A4|LETTER|LEGAL|A5 â€” generates at exact dimensions, no browser scaling.')

  // â”€â”€ 9. INTEGRATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionHeader('9. Integrations')

  const integrations = [
    ['Paystack', 'Payment processing', 'Wallet top-up via card/bank/USSD. Webhook validates payment before crediting wallet. HMAC-SHA512 signature verification. Idempotent â€” duplicate webhooks are safe.'],
    ['Resend', 'Email delivery', 'Transactional emails: receipt delivery, OTP login, payment reminders, support updates, security alerts.'],
    ['Termii', 'SMS delivery', 'Receipt verification links and installment reminders. Per-SMS cost deducted from issuer wallet.'],
    ['QoreID', 'Identity verification', 'NIN and BVN lookup for KYC. Verified status stored after session token validation.'],
    ['Supabase Storage', 'File storage', 'Receipt attachments (max 5 per receipt), partner logos, support ticket attachments.'],
    ['Google OAuth', 'Social login', 'One-click sign-in. New users redirected to complete profile form before dashboard access.'],
    ['QR Server API', 'QR code generation', 'Green-branded QR codes for Gold/Diamond/Platinum receipts embedded in PDF.'],
  ]

  integrations.forEach(([name, type, desc]) => {
    checkY(55)
    gap(4)
    page.drawRectangle({ x: ML, y: y - 36, width: CW, height: 50, color: WHITE, borderColor: BORDER, borderWidth: 0.5 })
    page.drawRectangle({ x: ML, y: y + 10, width: CW, height: 4, color: GREEN_LIGHT })
    page.drawText(name, { x: ML + 10, y: y + 3, size: 9, font: fonts.bold, color: GREEN })
    page.drawText(type, { x: W - MR - fonts.regular.widthOfTextAtSize(type, 8) - 10, y: y + 3, size: 8, font: fonts.italic, color: MUTED })
    y -= 14
    drawWrapped(desc, { size: 9, x: ML + 10, width: CW - 20, color: MUTED })
    gap(8)
  })

  // â”€â”€ 10. PRICING MODEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  sectionHeader('10. Pricing Model')
  drawWrapped('DigitalReceipt.ng uses a prepaid wallet model. Users top up their wallet with Naira and spend credits per receipt issued. There are no monthly subscription fees for the base product.', { size: 10 })
  gap(10)

  drawText('Receipt Pricing', { size: 11, font: fonts.bold })
  gap(4)
  tableRow(['Tier', 'Price per Receipt', 'Includes', 'Free Monthly Quota'], [70, 110, 200, CW - 380], true)
  tableRow(['Silver', 'NGN 100', 'Basic receipt, text verify, PDF', '5 receipts/month'], [70, 110, 200, CW - 380])
  tableRow(['Gold', 'NGN 200', '+ QR code on PDF', 'None'], [70, 110, 200, CW - 380])
  tableRow(['Diamond', 'NGN 500', '+ Priority support tier', 'None'], [70, 110, 200, CW - 380])
  tableRow(['Platinum', 'NGN 1,000', '+ Highest trust badge', 'None'], [70, 110, 200, CW - 380])
  gap(14)

  drawText('Additional Charges', { size: 11, font: fonts.bold })
  gap(4)
  tableRow(['Service', 'Cost', 'Notes'], [160, 100, CW - 260], true)
  tableRow(['SMS delivery', 'â‚¦10 per number', 'Charged to receipt owner\'s wallet'], [160, 100, CW - 260])
  tableRow(['Payment update', 'â‚¦200 per update', 'Partial payment recording on a receipt'], [160, 100, CW - 260])
  tableRow(['Wallet top-up', 'Free', 'No processing fee charged to user (Paystack fees absorbed)'], [160, 100, CW - 260])
  gap(14)

  infoBox('Revenue model: DigitalReceipt.ng earns on every non-free receipt issued and on each SMS sent. Volume discounts and enterprise plans are on the roadmap for Q3 2026.')

  // â”€â”€ 11. NON-FUNCTIONAL REQUIREMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionHeader('11. Non-Functional Requirements')

  const nfrs = [
    ['Performance', 'Page load < 2s on 3G. PDF generation < 3s. Receipt list renders server-side in < 500ms.'],
    ['Availability', '99.9% uptime target. Hosted on Vercel with global edge network. Supabase managed database.'],
    ['Scalability', 'Stateless Next.js functions scale horizontally. Wallet RPCs handle concurrent load without locks.'],
    ['Security', 'Zero known critical vulnerabilities. OTP 2FA for admin. Shield blocks automated attacks. RLS on all tables.'],
    ['Accessibility', 'Mobile-first responsive design. Works on low-end Android devices. Screen-reader compatible HTML structure.'],
    ['Internationalisation', 'NGN primary currency. Naira symbol (â‚¦) used throughout. WAT (West Africa Time) for all timestamps.'],
    ['Browser Support', 'Chrome 90+, Firefox 88+, Safari 14+, Edge 90+, Chrome for Android, Safari iOS 14+.'],
    ['Data Retention', 'Receipts retained indefinitely. Activity logs purged after 30 days. Security events retained for audit.'],
    ['Backup', 'Supabase daily automated backups. Point-in-time recovery available.'],
  ]

  nfrs.forEach(([k, v]) => bullet(k, v))

  // â”€â”€ 12. PRODUCT ROADMAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  sectionHeader('12. Product Roadmap')

  const quarters = [
    ['Q3 2026 â€” API & Integrations', [
      'Public REST API with API key authentication for third-party platforms',
      'Webhooks â€” notify external systems on receipt creation, payment, verification',
      'Zapier / Make integration connector',
      'WhatsApp delivery channel via Twilio or Meta Cloud API',
    ]],
    ['Q3 2026 â€” Enterprise Features', [
      'Volume pricing tiers for bulk issuers (schools, hospitals, government)',
      'Custom receipt templates with logo upload and brand colours',
      'Multi-user enterprise accounts with role-based access control',
      'Bulk receipt import via CSV upload',
    ]],
    ['Q4 2026 â€” Analytics & Intelligence', [
      'Issuer analytics dashboard: revenue trends, top customers, payment rate',
      'Buyer verification frequency analytics for fraud detection',
      'AI-powered anomaly detection on receipt patterns',
      'Monthly financial reports auto-emailed to issuers',
    ]],
    ['Q1 2027 â€” Ecosystem Expansion', [
      'Mobile app (React Native) for iOS and Android',
      'USSD access for receipt verification on feature phones (*xxx#)',
      'Point-of-sale (POS) terminal integration for physical retailers',
      'Government agency partnerships for official receipt infrastructure',
    ]],
    ['Q2 2027 â€” Financial Services', [
      'Digital receipt as proof of transaction for loan applications',
      'Integration with Nigerian banks for receipt-backed credit scoring',
      'Invoice financing: sell unpaid invoices at a discount for immediate cash',
      'Receipt-linked escrow service for high-value transactions',
    ]],
  ]

  quarters.forEach(([quarter, items]) => {
    checkY(80)
    gap(6)
    page.drawRectangle({ x: ML, y: y - 4, width: CW, height: 20, color: GREEN })
    page.drawText(quarter, { x: ML + 10, y: y + 2, size: 9, font: fonts.bold, color: WHITE })
    y -= 22
    items.forEach(item => bullet('', item, { indent: 8 }))
    gap(4)
  })

  // â”€â”€ 13. SUCCESS METRICS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionHeader('13. Success Metrics (KPIs)')

  const kpis = [
    ['Registered Issuers', '10,000 by end of 2026', 'User acquisition & retention'],
    ['Receipts Issued', '500,000 in year one', 'Platform adoption & usage'],
    ['Wallet Top-up Volume', 'â‚¦10M cumulative', 'Revenue & engagement'],
    ['Receipt Verifications', '50,000/month', 'Buyer trust & network effect'],
    ['SMS/Email Deliveries', '95% delivery rate', 'Communication reliability'],
    ['Admin Response Time', '< 24h for support tickets', 'Customer satisfaction'],
    ['Uptime', '99.9%', 'Infrastructure reliability'],
    ['Security Blocks', '0 successful breaches', 'Security effectiveness'],
    ['App Load Time', '< 2s P95', 'Performance'],
    ['Churn Rate', '< 5% monthly', 'Product-market fit'],
  ]

  tableRow(['Metric', 'Target', 'Category'], [180, 130, CW - 310], true)
  kpis.forEach(row => tableRow(row, [180, 130, CW - 310]))
  gap(14)

  // â”€â”€ 14. CONSTRAINTS & ASSUMPTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sectionHeader('14. Constraints & Assumptions')

  drawText('Constraints', { size: 11, font: fonts.bold })
  gap(4)
  bullet('', 'All payments processed in NGN via Paystack â€” no multi-currency support in v1.')
  bullet('', 'Wallet system requires manual top-up â€” no auto-debit or subscription billing in v1.')
  bullet('', 'KYC (NIN/BVN) is optional and non-blocking â€” users can issue receipts without verification.')
  bullet('', 'SMS delivery limited to Nigerian phone numbers via Termii.')
  bullet('', 'PDF generation is server-side only â€” no client-side PDF editing.')
  bullet('', 'Free tier limited to 3 Silver receipts per month â€” tracked per calendar month.')
  gap(10)

  drawText('Assumptions', { size: 11, font: fonts.bold })
  gap(4)
  bullet('', 'Target users have access to a smartphone or computer with internet connectivity.')
  bullet('', 'Paystack handles PCI-DSS compliance for card processing â€” DigitalReceipt.ng never stores card data.')
  bullet('', 'Supabase provides GDPR-compliant data storage with automatic encryption at rest.')
  bullet('', 'QoreID\'s NIN/BVN API maintains availability for KYC verification flows.')
  bullet('', 'Vercel\'s edge network provides sufficient global distribution for Nigerian users.')
  bullet('', 'Receipt fraud is common enough in Nigeria that users will pay for verified receipts.')
  gap(10)

  // â”€â”€ BACK COVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  newPage()
  y = H - 120
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: GREEN })
  page.drawText('DigitalReceipt.ng', { x: ML, y: H - 90, size: 22, font: fonts.bold, color: WHITE })
  page.drawText('Verified Receipts for Every Nigerian', { x: ML, y: H - 115, size: 11, font: fonts.regular, color: rgb(0.8, 0.95, 0.84) })

  page.drawLine({ start: { x: ML, y: H - 135 }, end: { x: W - MR, y: H - 135 }, thickness: 0.5, color: rgb(1,1,1,0.2) })

  page.drawText('https://digitalreceipt.ng', { x: ML, y: H - 160, size: 10, font: fonts.regular, color: rgb(0.8, 0.95, 0.84) })
  page.drawText('ayvicola@gmail.com', { x: ML, y: H - 178, size: 10, font: fonts.regular, color: rgb(0.8, 0.95, 0.84) })

  page.drawText('Â© 2026 DigitalReceipt.ng Â- Ayodele Victor Olaiya Â- All rights reserved.', {
    x: ML, y: 40, size: 8, font: fonts.regular, color: rgb(0.7, 0.9, 0.75),
  })
  page.drawText('This document is confidential and intended solely for the use of the individuals named above.', {
    x: ML, y: 28, size: 7, font: fonts.regular, color: rgb(0.6, 0.8, 0.65),
  })

  // â”€â”€ SAVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const outDir = resolve(__dirname, '../docs')
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, 'DigitalReceipt-PRD-v1.0.pdf')
  const bytes = await pdf.save()
  writeFileSync(outPath, bytes)
  console.log(`âœ“ PRD saved to: ${outPath} (${pages.length} pages)`)
}

generate().catch(err => { console.error(err); process.exit(1) })

