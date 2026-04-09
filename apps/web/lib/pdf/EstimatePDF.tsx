import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ExportTemplateSettings, ComplianceSettings } from '@/lib/settings-types';

// PDF-specific types (subset of full estimate types)
interface EstimateLineItem {
  id: string;
  csiCode: string;
  csiDivision: string;
  description: string;
  quantity: number;
  unit: string;
  laborRate: number;
  materialRate: number;
  laborTotal: number;
  materialTotal: number;
  total: number;
}

interface Estimate {
  name: string;
  status: string;
  updatedAt: string;
  totalAmount: number;
  subtotal: number;
  lineItems: EstimateLineItem[];
  overheadPct: number;
  overhead: number;
  profitPct: number;
  profit: number;
  bondRate: number;
  bondTotal: number;
  discount?: { type: string; amount: number; value: number; label?: string };
  aiConfidence?: number;
}

interface Project {
  name: string;
  agency: string;
  solicitation: string;
  setAside: string;
  location: string;
}

// ── Props ───────────────────────────────

export interface EstimatePDFProps {
  estimate: Estimate;
  project: Project;
  templates: ExportTemplateSettings;
  compliance: ComplianceSettings;
  organizationName: string;
}

// ── Styles ──────────────────────────────

const orange = '#f97316';
const zinc900 = '#18181b';
const zinc700 = '#3f3f46';
const zinc500 = '#71717a';
const zinc200 = '#e4e4e7';
const zinc50 = '#fafafa';

const CSI_NAMES: Record<string, string> = {
  '01': 'General Requirements', '02': 'Existing Conditions', '03': 'Concrete',
  '04': 'Masonry', '05': 'Metals', '06': 'Wood/Plastics/Composites',
  '07': 'Thermal & Moisture', '08': 'Openings', '09': 'Finishes',
  '10': 'Specialties', '11': 'Equipment', '12': 'Furnishings',
  '22': 'Plumbing', '23': 'HVAC', '26': 'Electrical',
  '27': 'Communications', '28': 'Electronic Safety', '31': 'Earthwork',
  '32': 'Exterior Improvements', '33': 'Utilities',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPrecise(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function groupByDivision(items: EstimateLineItem[]): Map<string, EstimateLineItem[]> {
  const map = new Map<string, EstimateLineItem[]>();
  for (const item of items) {
    const div = item.csiDivision;
    const existing = map.get(div) ?? [];
    existing.push(item);
    map.set(div, existing);
  }
  return map;
}

const makeStyles = (fontSize: number) =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontSize,
      fontFamily: 'Helvetica',
      color: zinc900,
    },
    // Cover page
    coverPage: {
      padding: 60,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    },
    coverTitle: {
      fontSize: fontSize + 14,
      fontFamily: 'Helvetica-Bold',
      color: zinc900,
      marginBottom: 8,
      textAlign: 'center',
    },
    coverSubtitle: {
      fontSize: fontSize + 4,
      color: zinc500,
      marginBottom: 40,
      textAlign: 'center',
    },
    coverMeta: {
      fontSize: fontSize + 1,
      color: zinc700,
      marginBottom: 4,
      textAlign: 'center',
    },
    coverCompany: {
      fontSize: fontSize + 6,
      fontFamily: 'Helvetica-Bold',
      color: orange,
      marginBottom: 6,
      textAlign: 'center',
    },
    coverAddress: {
      fontSize,
      color: zinc500,
      textAlign: 'center',
      marginBottom: 30,
    },
    coverTotal: {
      fontSize: fontSize + 10,
      fontFamily: 'Helvetica-Bold',
      color: orange,
      marginTop: 30,
      textAlign: 'center',
    },
    coverStatus: {
      fontSize: fontSize + 2,
      color: zinc500,
      marginTop: 8,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    // Watermark
    watermark: {
      position: 'absolute',
      top: '40%',
      left: '15%',
      fontSize: 72,
      color: '#e4e4e7',
      opacity: 0.3,
      transform: 'rotate(-45deg)',
      fontFamily: 'Helvetica-Bold',
    },
    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 2,
      borderBottomColor: orange,
      paddingBottom: 8,
      marginBottom: 16,
    },
    headerLeft: {},
    headerCompany: {
      fontSize: fontSize + 2,
      fontFamily: 'Helvetica-Bold',
      color: zinc900,
    },
    headerAddress: {
      fontSize: fontSize - 1,
      color: zinc500,
      marginTop: 2,
    },
    headerRight: {
      textAlign: 'right',
    },
    headerEstimate: {
      fontSize: fontSize + 1,
      fontFamily: 'Helvetica-Bold',
    },
    headerMeta: {
      fontSize: fontSize - 1,
      color: zinc500,
      marginTop: 1,
    },
    // Project info
    projectInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: zinc50,
      padding: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: zinc200,
      borderRadius: 4,
    },
    projectLabel: {
      fontSize: fontSize - 1,
      color: zinc500,
      marginBottom: 2,
    },
    projectValue: {
      fontSize,
      fontFamily: 'Helvetica-Bold',
    },
    // Division header
    divisionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: zinc50,
      padding: 6,
      marginTop: 12,
      marginBottom: 4,
      borderLeftWidth: 3,
      borderLeftColor: orange,
    },
    divisionName: {
      fontSize: fontSize + 1,
      fontFamily: 'Helvetica-Bold',
    },
    divisionTotal: {
      fontSize,
      fontFamily: 'Helvetica-Bold',
      color: zinc700,
    },
    // Table
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: zinc900,
      paddingBottom: 4,
      marginBottom: 4,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: zinc200,
      paddingVertical: 3,
      minHeight: 16,
    },
    tableRowAlt: {
      backgroundColor: zinc50,
    },
    // Column widths
    colCode: { width: '10%' },
    colDesc: { width: '26%' },
    colQty: { width: '8%', textAlign: 'right' },
    colUnit: { width: '6%', textAlign: 'center' },
    colLaborRate: { width: '10%', textAlign: 'right' },
    colMatRate: { width: '10%', textAlign: 'right' },
    colLabor: { width: '10%', textAlign: 'right' },
    colMat: { width: '10%', textAlign: 'right' },
    colTotal: { width: '10%', textAlign: 'right' },
    thText: {
      fontSize: fontSize - 1,
      fontFamily: 'Helvetica-Bold',
      color: zinc700,
    },
    cellText: {
      fontSize: fontSize - 1,
      color: zinc900,
    },
    cellCode: {
      fontSize: fontSize - 1,
      fontFamily: 'Courier',
      color: zinc700,
    },
    // Confidence pill
    confidencePill: {
      fontSize: fontSize - 2,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 8,
      textAlign: 'center',
    },
    // Summary
    summaryBox: {
      marginTop: 20,
      borderTopWidth: 2,
      borderTopColor: zinc900,
      paddingTop: 10,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 3,
    },
    summaryLabel: {
      fontSize,
      color: zinc700,
    },
    summaryValue: {
      fontSize,
      fontFamily: 'Helvetica-Bold',
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: zinc900,
    },
    grandTotalLabel: {
      fontSize: fontSize + 2,
      fontFamily: 'Helvetica-Bold',
    },
    grandTotalValue: {
      fontSize: fontSize + 2,
      fontFamily: 'Helvetica-Bold',
      color: orange,
    },
    // Compliance footer
    complianceBox: {
      marginTop: 20,
      padding: 8,
      borderWidth: 1,
      borderColor: zinc200,
      borderRadius: 4,
    },
    complianceTitle: {
      fontSize: fontSize - 1,
      fontFamily: 'Helvetica-Bold',
      color: zinc700,
      marginBottom: 4,
    },
    complianceText: {
      fontSize: fontSize - 2,
      color: zinc500,
      marginBottom: 2,
    },
    // Footer
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: zinc200,
      paddingTop: 6,
    },
    footerText: {
      fontSize: fontSize - 2,
      color: zinc500,
    },
    pageNum: {
      fontSize: fontSize - 2,
      color: zinc500,
    },
  });

// ── Page sizes ──────────────────────────

const PAGE_SIZES = {
  letter: 'LETTER' as const,
  legal: 'LEGAL' as const,
  a4: 'A4' as const,
};

// ── Cover Page ──────────────────────────

function CoverPage({ estimate, project, templates, organizationName }: Omit<EstimatePDFProps, 'compliance'>) {
  const s = makeStyles(templates.fontSize);
  return (
    <Page size={PAGE_SIZES[templates.pageSize]} style={s.page}>
      {estimate.status === 'draft' && templates.draftWatermark && (
        <Text style={s.watermark}>{templates.draftWatermark}</Text>
      )}
      <View style={s.coverPage}>
        {organizationName && (
          <>
            <Text style={s.coverCompany}>{organizationName}</Text>
            {templates.addressBlock && <Text style={s.coverAddress}>{templates.addressBlock}</Text>}
          </>
        )}
        <Text style={s.coverTitle}>{estimate.name}</Text>
        <Text style={s.coverSubtitle}>{project.name}</Text>
        <Text style={s.coverMeta}>Agency: {project.agency}</Text>
        <Text style={s.coverMeta}>Solicitation: {project.solicitation}</Text>
        <Text style={s.coverMeta}>Set-Aside: {project.setAside}</Text>
        <Text style={s.coverMeta}>Location: {project.location}</Text>
        <Text style={s.coverMeta}>Date: {fmtDate(estimate.updatedAt)}</Text>
        <Text style={s.coverTotal}>{fmt(estimate.totalAmount)}</Text>
        <Text style={s.coverStatus}>Status: {estimate.status}</Text>
      </View>
    </Page>
  );
}

// ── Line Items Pages ────────────────────

function LineItemsPages({ estimate, project, templates, compliance, organizationName }: EstimatePDFProps) {
  const s = makeStyles(templates.fontSize);
  const divisions = groupByDivision(estimate.lineItems);
  const showConfidence = templates.includeAIConfidence;

  return (
    <Page size={PAGE_SIZES[templates.pageSize]} style={s.page} wrap>
      {estimate.status === 'draft' && templates.draftWatermark && (
        <Text style={s.watermark} fixed>{templates.draftWatermark}</Text>
      )}

      {/* Header */}
      <View style={s.header} fixed>
        <View style={s.headerLeft}>
          <Text style={s.headerCompany}>{organizationName || "O'Neill Estimator"}</Text>
          {templates.addressBlock && <Text style={s.headerAddress}>{templates.addressBlock}</Text>}
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerEstimate}>{estimate.name}</Text>
          <Text style={s.headerMeta}>{fmtDate(estimate.updatedAt)}</Text>
          <Text style={s.headerMeta}>Status: {estimate.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Project info box */}
      <View style={s.projectInfo}>
        <View>
          <Text style={s.projectLabel}>Project</Text>
          <Text style={s.projectValue}>{project.name}</Text>
        </View>
        <View>
          <Text style={s.projectLabel}>Agency</Text>
          <Text style={s.projectValue}>{project.agency}</Text>
        </View>
        <View>
          <Text style={s.projectLabel}>Set-Aside</Text>
          <Text style={s.projectValue}>{project.setAside}</Text>
        </View>
        <View>
          <Text style={s.projectLabel}>Solicitation</Text>
          <Text style={s.projectValue}>{project.solicitation}</Text>
        </View>
      </View>

      {/* Line items by division */}
      {templates.includeCsiBreakdown ? (
        Array.from(divisions.entries()).map(([divCode, items]) => {
          const divTotal = items.reduce((s, i) => s + i.total, 0);
          return (
            <View key={divCode} wrap={false}>
              <View style={s.divisionHeader}>
                <Text style={s.divisionName}>Division {divCode} — {CSI_NAMES[divCode] ?? `Division ${divCode}`}</Text>
                <Text style={s.divisionTotal}>{fmt(divTotal)}</Text>
              </View>

              {/* Table header */}
              <View style={s.tableHeader}>
                <View style={s.colCode}><Text style={s.thText}>CSI Code</Text></View>
                <View style={s.colDesc}><Text style={s.thText}>Description</Text></View>
                <View style={s.colQty}><Text style={s.thText}>Qty</Text></View>
                <View style={s.colUnit}><Text style={s.thText}>Unit</Text></View>
                <View style={s.colLaborRate}><Text style={s.thText}>Labor $/U</Text></View>
                <View style={s.colMatRate}><Text style={s.thText}>Mat $/U</Text></View>
                <View style={s.colLabor}><Text style={s.thText}>Labor $</Text></View>
                <View style={s.colMat}><Text style={s.thText}>Mat $</Text></View>
                <View style={s.colTotal}><Text style={s.thText}>Total</Text></View>
              </View>

              {items.map((item, idx) => (
                <View key={item.id} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <View style={s.colCode}><Text style={s.cellCode}>{item.csiCode}</Text></View>
                  <View style={s.colDesc}><Text style={s.cellText}>{item.description}</Text></View>
                  <View style={s.colQty}><Text style={s.cellText}>{item.quantity.toLocaleString()}</Text></View>
                  <View style={s.colUnit}><Text style={s.cellText}>{item.unit}</Text></View>
                  <View style={s.colLaborRate}><Text style={s.cellText}>{fmtPrecise(item.laborRate)}</Text></View>
                  <View style={s.colMatRate}><Text style={s.cellText}>{fmtPrecise(item.materialRate)}</Text></View>
                  <View style={s.colLabor}><Text style={s.cellText}>{fmt(item.laborTotal)}</Text></View>
                  <View style={s.colMat}><Text style={s.cellText}>{fmt(item.materialTotal)}</Text></View>
                  <View style={s.colTotal}><Text style={[s.cellText, { fontFamily: 'Helvetica-Bold' }]}>{fmt(item.total)}</Text></View>
                </View>
              ))}
            </View>
          );
        })
      ) : (
        /* Flat table — no division grouping */
        <View>
          <View style={s.tableHeader}>
            <View style={s.colCode}><Text style={s.thText}>CSI Code</Text></View>
            <View style={s.colDesc}><Text style={s.thText}>Description</Text></View>
            <View style={s.colQty}><Text style={s.thText}>Qty</Text></View>
            <View style={s.colUnit}><Text style={s.thText}>Unit</Text></View>
            <View style={s.colLaborRate}><Text style={s.thText}>Labor $/U</Text></View>
            <View style={s.colMatRate}><Text style={s.thText}>Mat $/U</Text></View>
            <View style={s.colLabor}><Text style={s.thText}>Labor $</Text></View>
            <View style={s.colMat}><Text style={s.thText}>Mat $</Text></View>
            <View style={s.colTotal}><Text style={s.thText}>Total</Text></View>
          </View>
          {estimate.lineItems.map((item, idx) => (
            <View key={item.id} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
              <View style={s.colCode}><Text style={s.cellCode}>{item.csiCode}</Text></View>
              <View style={s.colDesc}><Text style={s.cellText}>{item.description}</Text></View>
              <View style={s.colQty}><Text style={s.cellText}>{item.quantity.toLocaleString()}</Text></View>
              <View style={s.colUnit}><Text style={s.cellText}>{item.unit}</Text></View>
              <View style={s.colLaborRate}><Text style={s.cellText}>{fmtPrecise(item.laborRate)}</Text></View>
              <View style={s.colMatRate}><Text style={s.cellText}>{fmtPrecise(item.materialRate)}</Text></View>
              <View style={s.colLabor}><Text style={s.cellText}>{fmt(item.laborTotal)}</Text></View>
              <View style={s.colMat}><Text style={s.cellText}>{fmt(item.materialTotal)}</Text></View>
              <View style={s.colTotal}><Text style={[s.cellText, { fontFamily: 'Helvetica-Bold' }]}>{fmt(item.total)}</Text></View>
            </View>
          ))}
        </View>
      )}

      {/* Summary */}
      <View style={s.summaryBox}>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>Subtotal ({estimate.lineItems.length} items)</Text>
          <Text style={s.summaryValue}>{fmt(estimate.subtotal)}</Text>
        </View>

        {estimate.discount && estimate.discount.type !== 'none' && estimate.discount.amount > 0 && (
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: '#dc2626' }]}>
              {estimate.discount.label || 'Discount'} ({estimate.discount.type === 'percentage' ? `${estimate.discount.value}%` : 'Fixed'})
            </Text>
            <Text style={[s.summaryValue, { color: '#dc2626' }]}>-{fmt(estimate.discount.amount)}</Text>
          </View>
        )}

        {templates.includeMarkupDetail && (
          <>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Overhead ({estimate.overheadPct}%)</Text>
              <Text style={s.summaryValue}>{fmt(estimate.overhead)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Profit ({estimate.profitPct}%)</Text>
              <Text style={s.summaryValue}>{fmt(estimate.profit)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Bond ({estimate.bondRate}%)</Text>
              <Text style={s.summaryValue}>{fmt(estimate.bondTotal)}</Text>
            </View>
          </>
        )}

        <View style={s.grandTotalRow}>
          <Text style={s.grandTotalLabel}>GRAND TOTAL</Text>
          <Text style={s.grandTotalValue}>{fmt(estimate.totalAmount)}</Text>
        </View>

        {showConfidence && estimate.aiConfidence != null && (
          <View style={[s.summaryRow, { marginTop: 8 }]}>
            <Text style={s.summaryLabel}>AI Confidence</Text>
            <Text style={[s.confidencePill, {
              backgroundColor: estimate.aiConfidence >= 0.85 ? '#dcfce7' : estimate.aiConfidence >= 0.65 ? '#fef3c7' : '#fee2e2',
              color: estimate.aiConfidence >= 0.85 ? '#15803d' : estimate.aiConfidence >= 0.65 ? '#92400e' : '#dc2626',
            }]}>{Math.round(estimate.aiConfidence * 100)}%</Text>
          </View>
        )}
      </View>

      {/* Compliance footer */}
      <View style={s.complianceBox} wrap={false}>
        <Text style={s.complianceTitle}>Federal Compliance</Text>
        {compliance.prevailingWageEnabled && (
          <Text style={s.complianceText}>• Davis-Bacon prevailing wages applied{compliance.davisBaconState ? ` (${compliance.davisBaconState}${compliance.davisBaconCounty ? `, ${compliance.davisBaconCounty}` : ''})` : ''}</Text>
        )}
        {compliance.certifications.sdvosb && <Text style={s.complianceText}>• SDVOSB certified contractor</Text>}
        {compliance.certifications.eightA && <Text style={s.complianceText}>• 8(a) certified contractor</Text>}
        {compliance.certifications.wosb && <Text style={s.complianceText}>• WOSB certified contractor</Text>}
        {compliance.cageCode && <Text style={s.complianceText}>• CAGE Code: {compliance.cageCode}</Text>}
        {compliance.ueiNumber && <Text style={s.complianceText}>• UEI: {compliance.ueiNumber}</Text>}
        {compliance.em385Compliance && <Text style={s.complianceText}>• EM 385-1-1 safety plan compliance required</Text>}
      </View>

      {/* Page footer */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>{organizationName || "O'Neill Estimator"} — {estimate.name}</Text>
        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  );
}

// ── Main Document ───────────────────────

export function EstimatePDF(props: EstimatePDFProps) {
  return (
    <Document
      title={`${props.estimate.name} — ${props.project.name}`}
      author={props.organizationName || "O'Neill Estimator"}
      subject="Construction Cost Estimate"
      creator="O'Neill Estimator"
    >
      {props.templates.coverPage && (
        <CoverPage
          estimate={props.estimate}
          project={props.project}
          templates={props.templates}
          organizationName={props.organizationName}
        />
      )}
      <LineItemsPages {...props} />
    </Document>
  );
}
