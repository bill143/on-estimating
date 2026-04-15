// ============================================================
// TAKEOFF MODULE — PLAN UPLOAD PIPELINE
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/lib/takeoff/plan-upload.ts
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { PlanSet, PlanSheet, UploadProgress } from '@/types/takeoff.types'
import { createPlanSet, createPlanSheet, updatePlanSetSheetCount } from '@/lib/supabase/takeoff-queries'

// ─── Types ───────────────────────────────────────────────────

interface UploadOptions {
  projectId: string
  planSetName: string
  version?: string
  userId: string
  onProgress?: (progress: UploadProgress) => void
}

interface UploadResult {
  plan_set: PlanSet
  sheets: PlanSheet[]
  signed_urls: Record<string, string>   // sheet_id → signed URL
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Full upload pipeline:
 * 1. Create PlanSet DB record
 * 2. Upload PDF to Supabase Storage
 * 3. Extract page metadata (dimensions, page count)
 * 4. Create one PlanSheet record per page
 * 5. Generate signed URLs for canvas display
 * 6. Update PlanSet sheet_count
 */
export async function uploadPlanSet(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const { projectId, planSetName, version = '1.0', userId, onProgress } = options

  reportProgress(onProgress, {
    file_name: file.name,
    total_pages: 0,
    pages_processed: 0,
    status: 'uploading',
  })

  // 1. Create PlanSet record
  const planSet = await createPlanSet(
    { project_id: projectId, name: planSetName, version },
    userId
  )

  // 2. Upload PDF to Supabase Storage
  const storagePath = `${projectId}/${planSet.id}/${sanitizeFileName(file.name)}`
  const supabase = getSupabase()

  const { error: uploadError } = await supabase.storage
    .from('plan-sheets')
    .upload(storagePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  // 3. Extract page info from PDF
  reportProgress(onProgress, {
    file_name: file.name,
    total_pages: 0,
    pages_processed: 0,
    status: 'extracting_pages',
  })

  const pageInfoList = await extractPDFPageInfo(file)
  const totalPages = pageInfoList.length

  reportProgress(onProgress, {
    file_name: file.name,
    total_pages: totalPages,
    pages_processed: 0,
    status: 'creating_records',
  })

  // 4. Create one PlanSheet record per page
  const sheets: PlanSheet[] = []
  const signedUrls: Record<string, string> = {}

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageInfo = pageInfoList[pageIndex]
    const sheetPath = `${projectId}/${planSet.id}/page-${pageIndex + 1}.pdf`

    // Upload individual page (for canvas rendering — single-page for pdfjs)
    const pageBlob = await extractPDFPage(file, pageIndex)
    if (pageBlob) {
      await supabase.storage
        .from('plan-sheets')
        .upload(sheetPath, pageBlob, { contentType: 'application/pdf', upsert: true })
    }

    const sheet = await createPlanSheet(planSet.id, {
      sheet_number: inferSheetNumber(pageInfo.title, pageIndex),
      sheet_title: pageInfo.title || `Sheet ${pageIndex + 1}`,
      discipline: inferDiscipline(pageInfo.title),
      storage_path: pageBlob ? sheetPath : storagePath,
      width_px: pageInfo.width_px,
      height_px: pageInfo.height_px,
      page_number: pageIndex,
      status: 'ready',
    })

    // Generate signed URL (1-hour)
    const { data: signed } = await supabase.storage
      .from('plan-sheets')
      .createSignedUrl(sheet.storage_path, 3600)

    if (signed?.signedUrl) {
      signedUrls[sheet.id] = signed.signedUrl
    }

    sheets.push({ ...sheet, signed_url: signed?.signedUrl })

    reportProgress(onProgress, {
      file_name: file.name,
      total_pages: totalPages,
      pages_processed: pageIndex + 1,
      status: pageIndex + 1 === totalPages ? 'complete' : 'creating_records',
    })
  }

  // 5. Update PlanSet with final sheet count
  await updatePlanSetSheetCount(planSet.id, sheets.length)

  return {
    plan_set: { ...planSet, sheet_count: sheets.length, status: 'ready' },
    sheets,
    signed_urls: signedUrls,
  }
}

/**
 * Refresh signed URLs for a list of sheets (URLs expire after 1 hour).
 */
export async function refreshSignedUrls(
  sheets: PlanSheet[]
): Promise<Record<string, string>> {
  const supabase = getSupabase()
  const result: Record<string, string> = {}

  await Promise.all(
    sheets.map(async sheet => {
      const { data } = await supabase.storage
        .from('plan-sheets')
        .createSignedUrl(sheet.storage_path, 3600)
      if (data?.signedUrl) result[sheet.id] = data.signedUrl
    })
  )

  return result
}

// ─── PDF utilities ────────────────────────────────────────────

interface PDFPageInfo {
  title: string
  width_px: number
  height_px: number
  page_number: number
}

/**
 * Extract page dimensions and title from PDF using pdfjs-dist.
 * Safe to call in browser — pdfjs-dist is already installed in on-estimating.
 */
async function extractPDFPageInfo(file: File): Promise<PDFPageInfo[]> {
  try {
    // Dynamic import — only runs in browser
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pageCount = pdf.numPages
    const pages: PDFPageInfo[] = []

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1.5 })

      // Try to extract title from page text (title block area)
      let title = ''
      try {
        const textContent = await page.getTextContent()
        title = extractSheetTitleFromText(
          textContent.items.map((item: { str?: string }) => item.str ?? '').join(' ')
        )
      } catch {
        // Title extraction is best-effort
      }

      pages.push({
        title: title || `Sheet ${i}`,
        width_px: Math.round(viewport.width),
        height_px: Math.round(viewport.height),
        page_number: i - 1,
      })
    }

    return pages
  } catch (err) {
    console.warn('[PlanUpload] PDF page extraction failed:', err)
    // Return a single-page fallback
    return [{ title: file.name.replace('.pdf', ''), width_px: 1700, height_px: 1100, page_number: 0 }]
  }
}

/**
 * Extract a single page from PDF as a Blob.
 * Returns null if extraction fails (upload still proceeds with full PDF path).
 */
async function extractPDFPage(file: File, pageIndex: number): Promise<Blob | null> {
  try {
    // For now: return the original file for single-page PDFs,
    // or null for multi-page (canvas will use page_number to navigate).
    // Full page splitting requires pdf-lib — add when needed.
    const arrayBuffer = await file.arrayBuffer()
    const pdfjsLib = await import('pdfjs-dist')
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    if (pdf.numPages === 1 && pageIndex === 0) {
      return file  // Single-page PDF: use as-is
    }

    // Multi-page: return null — canvas viewer uses page_number parameter
    return null
  } catch {
    return null
  }
}

// ─── Metadata inference ───────────────────────────────────────

function extractSheetTitleFromText(text: string): string {
  // Look for common title block patterns
  const patterns = [
    /([A-Z]-\d+[.\d]*)\s+[-–]\s+(.{5,60})/,    // "A-101 - First Floor Plan"
    /SHEET\s+([A-Z]\d+)\s*[-–:]\s*(.{5,60})/i,  // "SHEET A101: First Floor Plan"
    /(FIRST|SECOND|THIRD|GROUND|BASEMENT|ROOF)\s+FLOOR\s+PLAN/i,
    /(SITE|FLOOR|ROOF|FOUNDATION|FRAMING|ELECTRICAL|PLUMBING|HVAC|MECHANICAL)\s+PLAN/i,
    /(ELEVATION|SECTION|DETAIL|SCHEDULE)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0].slice(0, 80).trim()
    }
  }

  return ''
}

function inferSheetNumber(title: string, index: number): string {
  const match = title.match(/([A-Z]-?\d+[.\d]*)/i)
  if (match) return match[1].toUpperCase()

  const prefixMap: Record<string, string> = {
    architectural: 'A',
    structural: 'S',
    mechanical: 'M',
    electrical: 'E',
    plumbing: 'P',
    civil: 'C',
    site: 'C',
  }

  for (const [key, prefix] of Object.entries(prefixMap)) {
    if (title.toLowerCase().includes(key)) {
      return `${prefix}-${String(index + 1).padStart(3, '0')}`
    }
  }

  return `G-${String(index + 1).padStart(3, '0')}`
}

function inferDiscipline(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('structural') || lower.includes('framing') || lower.includes('foundation')) return 'Structural'
  if (lower.includes('electrical') || lower.includes('power') || lower.includes('lighting')) return 'Electrical'
  if (lower.includes('mechanical') || lower.includes('hvac') || lower.includes('duct')) return 'Mechanical'
  if (lower.includes('plumbing') || lower.includes('sanitary') || lower.includes('piping')) return 'Plumbing'
  if (lower.includes('civil') || lower.includes('site') || lower.includes('grading')) return 'Civil'
  if (lower.includes('fire') || lower.includes('sprinkler')) return 'Fire Protection'
  return 'Architectural'
}

// ─── Internal helpers ─────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
}

function reportProgress(
  onProgress: ((p: UploadProgress) => void) | undefined,
  progress: UploadProgress
): void {
  onProgress?.(progress)
}
