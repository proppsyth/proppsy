// EXACTLY mirror test-min7 to verify the file location/import chain works
import React from 'react'
import path from 'path'
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { parseTemplate } from './contract/markdownParser'
import { renderBodyBlocks } from './contract/PdfBodyRenderer'

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Bold.ttf'), fontWeight: 700 },
  ],
})

const C = {
  navy: '#1B3B6F', text: '#1A1A1A', sub: '#4A4A4A', light: '#888888',
  border: '#D0D8E8', white: '#FFFFFF',
}
const HEADER_H = 60
const FOOTER_H = 44
const PAD_H = 52

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun', fontSize: 9.5,
    paddingTop: HEADER_H + 32, paddingBottom: FOOTER_H + 60, paddingHorizontal: PAD_H,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD_H, paddingVertical: 10,
  },
  hLeft:       { flex: 1, justifyContent: 'center' },
  hTitle:      { fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: 0.3 },
  hDocNo:      { fontSize: 7.5, color: C.sub, marginTop: 2 },
  hDivider:    { width: 1, height: 28, backgroundColor: C.border, marginHorizontal: 20 },
  hRight:      { alignItems: 'flex-end', justifyContent: 'center' },
  hAgentName:  { fontSize: 8.5, fontWeight: 700, color: C.navy, textAlign: 'right' },
  hAgentPhone: { fontSize: 7.5, color: C.sub, textAlign: 'right', marginTop: 2 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_H,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD_H,
    borderTopWidth: 0.5, borderTopColor: C.border,
  },
  fL: { flex: 1, fontSize: 9, color: C.sub },
  fC: { flex: 1, fontSize: 9, color: C.sub, textAlign: 'center' },
  fR: { flex: 1, fontSize: 9, color: C.sub, textAlign: 'right' },

  miniSigRow: {
    position: 'absolute', bottom: FOOTER_H + 8, left: PAD_H, right: PAD_H,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  miniSigBox:     { width: 110, alignItems: 'center' },
  miniSigImgWrap: { height: 20, justifyContent: 'flex-end', marginBottom: 2 },
  miniSigImg:     { width: 70, height: 18, objectFit: 'contain' },
  miniSigLine:    { width: 100, borderBottomWidth: 0.8, borderBottomColor: C.text, marginBottom: 2 },
  miniSigLabel:   { fontSize: 7, color: C.sub, textAlign: 'center' },

  finalSigSection: { marginTop: 40, paddingTop: 16 },
  finalSigRow:     { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
  finalSigBox:     { alignItems: 'center', width: '42%' },
  finalSigImgArea: { height: 54, justifyContent: 'flex-end', marginBottom: 6 },
  finalSigImg:     { width: 110, height: 48, objectFit: 'contain' },
  finalSigLine:    { width: '100%', borderBottomWidth: 1.2, borderBottomColor: C.navy, marginBottom: 7 },
  finalSigRole:    { fontSize: 9, fontWeight: 700, color: C.navy, textAlign: 'center', marginBottom: 3 },
  finalSigName:    { fontSize: 8.5, color: C.sub, textAlign: 'center', marginBottom: 10 },
  finalSigDate:    { fontSize: 7.5, color: C.light, textAlign: 'center', marginTop: 4 },
})

// ─── Inline types (avoid importing mammothToPdf side effects) ──────

export interface PdfSigner {
  label:         string
  name:          string
  signatureUrl?: string | null
  signedAt?:     string | null
}
export interface PdfMeta {
  contractId?:   string
  docTypeLabel?: string
  agentName?:    string
  agentPhone?:   string
  status?:       string
  isFinalized?:  boolean
  generatedAt?:  string
  signers?:      PdfSigner[]
}

type ParsedDoc = ReturnType<typeof parseTemplate>

// ─── Mini-sig slot helper ─────────────────────────────────────────

function MiniSigSlot({ sig }: { sig: PdfSigner }) {
  return (
    <View style={s.miniSigBox}>
      <View style={s.miniSigImgWrap}>
        {sig.signatureUrl
          ? <Image style={s.miniSigImg} src={sig.signatureUrl} />
          : null
        }
      </View>
      <View style={s.miniSigLine} />
      <Text style={s.miniSigLabel}>{sig.label}</Text>
    </View>
  )
}

// ─── Document component ───────────────────────────────────────────

function ContractDocument({
  blocks, features, meta,
}: {
  blocks:   ParsedDoc['blocks']
  features: ParsedDoc['features']
  meta:     Required<PdfMeta>
}) {
  const statusText = meta.isFinalized
    ? 'FINALIZED'
    : (meta.status === 'draft' ? 'DRAFT' : (meta.status || 'DRAFT').toUpperCase().replace(/_/g, ' '))

  return (
    <Document title={`${meta.docTypeLabel} ${meta.contractId}`}>
      <Page size="A4" style={s.page}>

        {/* ── HEADER (fixed) ── */}
        <View fixed style={s.header}>
          <View style={s.hLeft}>
            <Text style={s.hTitle}>{meta.docTypeLabel}</Text>
            {meta.contractId
              ? <Text style={s.hDocNo}>เลขที่  {meta.contractId}  ·  {statusText}</Text>
              : null
            }
          </View>
          {meta.agentName ? <View style={s.hDivider} /> : null}
          {meta.agentName ? (
            <View style={s.hRight}>
              <Text style={s.hAgentName}>{meta.agentName}</Text>
              {meta.agentPhone
                ? <Text style={s.hAgentPhone}>{meta.agentPhone}</Text>
                : null
              }
            </View>
          ) : null}
        </View>

        {/* ── PAGE NUMBER (fixed footer, every page) ── */}
        {features.pageNumbers && (
          <View fixed style={s.footer}>
            <Text style={s.fL}> </Text>
            <Text
              style={s.fC}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              render={({ pageNumber, totalPages }: any) => `หน้า ${pageNumber} / ${totalPages}`}
            />
            <Text style={s.fR}> </Text>
          </View>
        )}

        {/* ── MINI-SIGS (fixed, hidden on last page) ── */}
        {features.miniSignatures && meta.signers.length > 0 && (
          <View
            fixed
            style={s.miniSigRow}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render={({ pageNumber, totalPages }: any) => {
              if (pageNumber >= totalPages) return null
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1 }}>
                  {meta.signers[0] ? <MiniSigSlot sig={meta.signers[0]} /> : <View style={s.miniSigBox} />}
                  {meta.signers[1] ? <MiniSigSlot sig={meta.signers[1]} /> : <View style={s.miniSigBox} />}
                </View>
              )
            }}
          />
        )}

        {/* ── BODY ── */}
        {renderBodyBlocks(blocks)}

        {/* ── FINAL SIG BLOCK (last page) ── */}
        {features.finalSignature && meta.signers.length > 0 && (
          <View style={s.finalSigSection}>
            <View style={s.finalSigRow}>
              {meta.signers.map((sig, i) => (
                <View key={i} style={s.finalSigBox}>
                  <View style={s.finalSigImgArea}>
                    {sig.signatureUrl
                      ? <Image style={s.finalSigImg} src={sig.signatureUrl} />
                      : null
                    }
                  </View>
                  <View style={s.finalSigLine} />
                  <Text style={s.finalSigRole}>{sig.label}</Text>
                  {sig.name ? <Text style={s.finalSigName}>({sig.name})</Text> : null}
                  <Text style={s.finalSigDate}>
                    {sig.signedAt ?? 'วันที่  .......... / .......... / ..........'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </Page>
    </Document>
  )
}

// Backward-compat exports
export { deEscape, substituteVars } from './contract/markdownParser'

const DEFAULT_SIGNERS: PdfSigner[] = [
  { label: 'ผู้ให้เช่า', name: '' },
  { label: 'ผู้เช่า',    name: '' },
]

export async function renderMarkdownAsPdf(
  mdContent: string,
  vars: Record<string, string>,
  meta?: Partial<PdfMeta>,
): Promise<Buffer> {
  const resolved: Required<PdfMeta> = {
    contractId:   meta?.contractId   ?? '',
    docTypeLabel: meta?.docTypeLabel ?? 'เอกสารสัญญา',
    agentName:    meta?.agentName    ?? '',
    agentPhone:   meta?.agentPhone   ?? '',
    status:       meta?.status       ?? 'draft',
    isFinalized:  meta?.isFinalized  ?? false,
    generatedAt:  meta?.generatedAt  ?? new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
    signers: meta?.signers ?? DEFAULT_SIGNERS,
  }
  const { blocks, features } = parseTemplate(mdContent, vars)
  const element = <ContractDocument blocks={blocks} features={features} meta={resolved} />
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any)
}
