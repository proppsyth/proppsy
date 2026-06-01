/** CSS for the attachment system — injected into the main PDF <style> block.
 *  Designed to match the existing premium PDF design system (navy #1B3B6F, accent #3B6CD4). */
export const ATTACHMENT_CSS = `
  /* ─── Attachment: Cover ──────────────────────────────── */
  .att-cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 220pt;
    padding: 48pt 0;
    text-align: center;
  }
  .att-cover-label {
    font-size: 8pt;
    font-weight: 700;
    color: #3B6CD4;
    letter-spacing: 3pt;
    margin-bottom: 10pt;
  }
  .att-cover-title {
    font-size: 18pt;
    font-weight: 700;
    color: #1B3B6F;
    line-height: 1.4;
    margin-bottom: 4pt;
  }
  .att-cover-subtitle {
    font-size: 11pt;
    color: #3B6CD4;
    letter-spacing: 1pt;
    margin-bottom: 20pt;
  }
  .att-cover-rule {
    width: 60pt;
    border: none;
    border-bottom: 2pt solid #3B6CD4;
    margin: 0 auto 20pt;
  }
  .att-cover-meta {
    font-size: 9pt;
    color: #4A5568;
    margin-bottom: 3pt;
  }
  .att-cover-toc {
    margin-top: 24pt;
    border: 0.5pt solid #D0DBF0;
    border-radius: 6pt;
    padding: 12pt 24pt;
    min-width: 220pt;
    text-align: left;
  }
  .att-cover-toc-title {
    font-size: 8.5pt;
    font-weight: 700;
    color: #1B3B6F;
    margin-bottom: 8pt;
    letter-spacing: 0.5pt;
  }
  .att-toc-item {
    font-size: 9pt;
    color: #4A5568;
    padding: 3pt 0;
    border-bottom: 0.4pt solid #F0F4F8;
  }
  .att-toc-item:last-child { border-bottom: none; }

  /* ─── Attachment: Section header ─────────────────────── */
  .att-section-header {
    display: flex;
    align-items: flex-start;
    gap: 8pt;
    margin-bottom: 12pt;
    padding-bottom: 6pt;
    border-bottom: 1.5pt solid #3B6CD4;
  }
  .att-section-num {
    min-width: 18pt;
    height: 18pt;
    border-radius: 50%;
    background: #1B3B6F;
    color: white;
    font-size: 8pt;
    font-weight: 700;
    text-align: center;
    line-height: 18pt;
    flex-shrink: 0;
  }
  .att-section-title {
    font-size: 11pt;
    font-weight: 700;
    color: #1B3B6F;
    line-height: 1.3;
  }
  .att-section-en {
    font-size: 8.5pt;
    color: #6B7A99;
    margin-top: 1pt;
  }

  /* ─── Attachment: ID cards ───────────────────────────── */
  .att-idcard-block {
    margin-bottom: 20pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .att-idcard-person {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1B3B6F;
    margin-bottom: 4pt;
  }
  .att-idcard-meta {
    font-size: 8.5pt;
    color: #6B7A99;
    margin-bottom: 6pt;
  }
  .att-idcard-wrapper {
    position: relative;
    display: inline-block;
  }
  .att-idcard-img {
    max-width: 290pt;
    max-height: 185pt;
    border: 0.8pt solid #D0DBF0;
    border-radius: 4pt;
    display: block;
  }
  .att-idcard-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-28deg);
    font-size: 22pt;
    font-weight: 700;
    color: rgba(27, 59, 111, 0.16);
    white-space: nowrap;
    pointer-events: none;
    letter-spacing: 5pt;
  }
  .att-idcard-none {
    display: inline-block;
    border: 0.5pt dashed #C8D6E8;
    border-radius: 4pt;
    padding: 16pt 24pt;
    color: #8090B0;
    font-size: 8.5pt;
    text-align: center;
    background: #F7F9FF;
  }

  /* ─── Attachment: Tables (inventory, keys) ───────────── */
  .att-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 12pt;
  }
  .att-table th {
    background: #1B3B6F;
    color: white;
    font-weight: 700;
    padding: 4pt 5pt;
    text-align: center;
    border: 0.5pt solid #1B3B6F;
    font-size: 8pt;
  }
  .att-table th.att-th-left { text-align: left; }
  .att-table td {
    padding: 3pt 5pt;
    border: 0.5pt solid #D0DBF0;
    vertical-align: top;
    line-height: 1.5;
  }
  .att-table tr:nth-child(even) td { background: #F7F9FF; }
  .att-td-num { text-align: center; width: 18pt; }
  .att-td-qty { text-align: center; width: 28pt; }
  .att-td-check { text-align: center; width: 52pt; }
  .att-td-note { width: auto; }
  .att-td-penalty { text-align: right; width: 70pt; }

  /* ─── Attachment: Signature lines ───────────────────── */
  .att-sig-row {
    display: flex;
    justify-content: space-between;
    margin-top: 18pt;
    gap: 20pt;
  }
  .att-sig-box { flex: 1; text-align: center; }
  .att-sig-line { border-bottom: 1pt solid #1B3B6F; margin-bottom: 5pt; }
  .att-sig-label { font-size: 8.5pt; font-weight: 700; color: #1B3B6F; }
  .att-sig-date { font-size: 7.5pt; color: #888; margin-top: 3pt; }

  /* ─── Attachment: Photo grid ─────────────────────────── */
  .att-photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8pt;
    margin-bottom: 12pt;
  }
  .att-photo-cell {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .att-photo-img {
    width: 100%;
    height: 128pt;
    object-fit: cover;
    border: 0.5pt solid #D0DBF0;
    border-radius: 3pt;
    display: block;
  }
  .att-photo-num {
    font-size: 7.5pt;
    color: #6B7A99;
    text-align: center;
    margin-top: 2pt;
  }

  /* ─── Attachment: Placeholder (facilities phase 1) ───── */
  .att-placeholder {
    border: 0.5pt dashed #C8D6E8;
    border-radius: 6pt;
    padding: 28pt;
    text-align: center;
    background: #F7F9FF;
  }
  .att-placeholder-text { font-size: 9pt; color: #8090B0; }
  .att-placeholder-note { font-size: 8pt; color: #B0BDD0; margin-top: 6pt; }

  /* ─── Attachment: Info note ──────────────────────────── */
  .att-note {
    font-size: 8.5pt;
    color: #6B7A99;
    margin-bottom: 10pt;
    padding: 6pt 10pt;
    background: #F7F9FF;
    border-left: 2pt solid #3B6CD4;
    border-radius: 0 3pt 3pt 0;
  }
`
