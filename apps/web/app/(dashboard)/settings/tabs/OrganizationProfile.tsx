'use client';

import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import {
  Building2,
  Upload,
  X,
  Plus,
  FileText,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Landmark,
  Globe,
  Award,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/lib/settings-store';
import type { InsuranceCert } from '@/lib/settings-types';

// ── Constants ──────────────────────────────

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC','AS','GU','MP','PR','VI',
];

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  DC:'District of Columbia',AS:'American Samoa',GU:'Guam',
  MP:'Northern Mariana Islands',PR:'Puerto Rico',VI:'U.S. Virgin Islands',
};

const FEDERAL_AGENCIES = [
  'VA','USACE','NAVFAC','GSA','DHS','DOE','DISA','USAF','NASA','HHS','DOJ','DOT',
];

const COMMON_NAICS = [
  '236220','237110','237310','237990','238110','238120','238130',
  '238140','238150','238160','238170','238190','238210','238220',
  '238290','238310','238320','238330','238340','238350','238390',
  '238910','238990','541310','541320','541330','541340','541350',
  '541370','541380','541410','541420','541620','561210','561730',
];

// ── Helpers ────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  return Number(cleaned) || 0;
}

function certExpiryStatus(expiryDate: string): { label: string; color: string } {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return { label: 'Expired', color: 'bg-red-100 text-red-700' };
  if (diffDays <= 30) return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700' };
  return { label: 'Valid', color: 'bg-green-100 text-green-700' };
}

// ── Section heading helper ─────────────────

function SectionHeading({ icon: Icon, title }: { icon: typeof Building2; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-orange-500" />
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
    </div>
  );
}

// ── Component ──────────────────────────────

export default function OrganizationProfile() {
  const organization = useSettingsStore((s) => s.organization);
  const updateOrganization = useSettingsStore((s) => s.updateOrganization);

  // Local state for Company Info section (saved on button click)
  const [localName, setLocalName] = useState(organization.name);
  const [localStreet, setLocalStreet] = useState(organization.address.street);
  const [localCity, setLocalCity] = useState(organization.address.city);
  const [localState, setLocalState] = useState(organization.address.state);
  const [localZip, setLocalZip] = useState(organization.address.zip);

  const [naicsInput, setNaicsInput] = useState('');
  const [agencyOther, setAgencyOther] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coiInputRef = useRef<HTMLInputElement>(null);
  const [serviceAreaSelect, setServiceAreaSelect] = useState('');

  // ── Handlers ───────────────────────────

  const handleSaveCompanyInfo = () => {
    updateOrganization({
      name: localName,
      address: { street: localStreet, city: localCity, state: localState, zip: localZip },
    });
    toast.success('Company information saved');
  };

  const handleLogoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    updateOrganization({ logoUrl: url });
    toast.success('Logo updated');
  };

  const handleLogoDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleLogoFile(file);
  };

  const handleLogoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleSaveFederalIds = () => {
    toast.success('Federal identifiers saved');
  };

  const handleCertToggle = (key: keyof typeof organization.certifications) => {
    updateOrganization({
      certifications: {
        ...organization.certifications,
        [key]: !organization.certifications[key],
      },
    });
    toast.success(
      `${key === 'eightA' ? '8(a)' : key.toUpperCase()} certification ${
        !organization.certifications[key] ? 'enabled' : 'disabled'
      }`,
    );
  };

  const addNaicsCode = () => {
    const code = naicsInput.trim();
    if (code && !organization.naicsCodes.includes(code)) {
      const updated = [...organization.naicsCodes, code];
      updateOrganization({
        naicsCodes: updated,
        primaryNaics: organization.primaryNaics || code,
      });
      toast.success(`NAICS code ${code} added`);
    }
    setNaicsInput('');
  };

  const removeNaicsCode = (code: string) => {
    const updated = organization.naicsCodes.filter((c) => c !== code);
    updateOrganization({
      naicsCodes: updated,
      primaryNaics: organization.primaryNaics === code ? (updated[0] || '') : organization.primaryNaics,
    });
    toast.success(`NAICS code ${code} removed`);
  };

  const setPrimaryNaics = (code: string) => {
    updateOrganization({ primaryNaics: code });
    toast.success(`${code} set as primary NAICS`);
  };

  const toggleAgency = (agency: string) => {
    const current = organization.federalAgencies;
    const isRemoving = current.includes(agency);
    const updated = isRemoving
      ? current.filter((a) => a !== agency)
      : [...current, agency];
    updateOrganization({ federalAgencies: updated });
    toast.success(`${agency} ${isRemoving ? 'removed' : 'added'}`);
  };

  const addServiceArea = (state: string) => {
    if (state && !organization.serviceAreas.includes(state)) {
      updateOrganization({ serviceAreas: [...organization.serviceAreas, state] });
      toast.success(`${STATE_NAMES[state] || state} added to service areas`);
    }
    setServiceAreaSelect('');
  };

  const removeServiceArea = (state: string) => {
    updateOrganization({ serviceAreas: organization.serviceAreas.filter((s) => s !== state) });
    toast.success(`${STATE_NAMES[state] || state} removed from service areas`);
  };

  const handleSaveBonding = (field: 'singleJobLimit' | 'aggregateLimit', value: number) => {
    updateOrganization({
      bonding: { ...organization.bonding, [field]: value },
    });
    toast.success('Bonding capacity updated');
  };

  const addInsuranceCert = (file: File) => {
    const newCert: InsuranceCert = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      fileUrl: URL.createObjectURL(file),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    updateOrganization({ insuranceCerts: [...organization.insuranceCerts, newCert] });
    toast.success('Insurance certificate uploaded');
  };

  const removeInsuranceCert = (id: string) => {
    updateOrganization({ insuranceCerts: organization.insuranceCerts.filter((c) => c.id !== id) });
    toast.success('Certificate removed');
  };

  const updateCertExpiry = (id: string, date: string) => {
    updateOrganization({
      insuranceCerts: organization.insuranceCerts.map((c) =>
        c.id === id ? { ...c, expiryDate: date } : c
      ),
    });
    toast.success('Expiry date updated');
  };

  // ── Render ─────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── 1. Company Information ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={Building2} title="Company Information" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="org-name">Company Name</Label>
            <Input
              id="org-name"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="O'Neill Construction Inc."
              className="mt-1"
            />
          </div>

          {/* Logo upload */}
          <div>
            <Label>Company Logo</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleLogoDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'
              }`}
            >
              {organization.logoUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={organization.logoUrl}
                    alt="Company logo"
                    className="h-20 w-auto object-contain rounded"
                  />
                  <p className="text-xs text-zinc-500">Click or drag to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-sm font-medium">Drop your logo here or click to upload</p>
                  <p className="text-xs text-zinc-400">PNG, JPG, or SVG up to 2MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={localStreet}
              onChange={(e) => setLocalStreet(e.target.value)}
              placeholder="123 Main St, Suite 200"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={localCity}
                onChange={(e) => setLocalCity(e.target.value)}
                placeholder="Virginia Beach"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                value={localState}
                onChange={(e) => setLocalState(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {STATE_NAMES[s]} ({s})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={localZip}
                onChange={(e) => setLocalZip(e.target.value)}
                placeholder="23456"
                className="mt-1"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSaveCompanyInfo}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Save Company Info
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Federal Identifiers ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={Landmark} title="Federal Identifiers" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cage">CAGE Code</Label>
              <Input
                id="cage"
                value={organization.cageCode}
                onChange={(e) => updateOrganization({ cageCode: e.target.value.toUpperCase() })}
                placeholder="1ABC2"
                maxLength={5}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="uei">DUNS / UEI Number</Label>
              <Input
                id="uei"
                value={organization.ueiNumber}
                onChange={(e) => updateOrganization({ ueiNumber: e.target.value.toUpperCase() })}
                placeholder="ZQGGQQHG1AB1"
                className="mt-1 font-mono"
              />
            </div>
          </div>
          <div className="pt-4">
            <Button
              onClick={handleSaveFederalIds}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Save Identifiers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Certifications ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={ShieldCheck} title="Certifications" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {([
              { key: 'eightA' as const, label: '8(a) Business Development' },
              { key: 'sdvosb' as const, label: 'Service-Disabled Veteran-Owned Small Business (SDVOSB)' },
              { key: 'wosb' as const, label: 'Women-Owned Small Business (WOSB)' },
              { key: 'hubzone' as const, label: 'HUBZone' },
              { key: 'sb' as const, label: 'Small Business' },
            ]).map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <span className="text-sm text-zinc-700">{label}</span>
                <Switch
                  checked={organization.certifications[key]}
                  onCheckedChange={() => handleCertToggle(key)}
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 4. NAICS Codes ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={Award} title="NAICS Codes" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Input
                value={naicsInput}
                onChange={(e) => setNaicsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addNaicsCode();
                  }
                }}
                placeholder="Enter NAICS code (e.g. 236220)"
                list="naics-suggestions"
                className="font-mono"
              />
              <datalist id="naics-suggestions">
                {COMMON_NAICS.filter((c) => !organization.naicsCodes.includes(c)).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <Button
              onClick={addNaicsCode}
              variant="outline"
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {organization.naicsCodes.length > 0 ? (
            <div className="space-y-2">
              {organization.naicsCodes.map((code) => (
                <div
                  key={code}
                  className="flex items-center gap-3 py-1.5"
                >
                  <input
                    type="radio"
                    name="primary-naics"
                    checked={organization.primaryNaics === code}
                    onChange={() => setPrimaryNaics(code)}
                    className="w-4 h-4 text-orange-500 border-zinc-300 focus:ring-orange-500"
                  />
                  <Badge
                    variant="secondary"
                    className="font-mono text-sm gap-1.5"
                  >
                    {code}
                    {organization.primaryNaics === code && (
                      <span className="text-[10px] font-semibold text-orange-600 uppercase ml-1">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeNaicsCode(code)}
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-zinc-500 mt-2">
                Select the radio button to set your primary NAICS code.
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No NAICS codes added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Bonding Capacity ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={ShieldCheck} title="Bonding Capacity" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="single-bond">Single Job Limit</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <Input
                  id="single-bond"
                  value={organization.bonding.singleJobLimit ? formatCurrency(organization.bonding.singleJobLimit).replace('$', '') : ''}
                  onChange={(e) =>
                    updateOrganization({
                      bonding: { ...organization.bonding, singleJobLimit: parseCurrencyInput(e.target.value) },
                    })
                  }
                  onBlur={(e) => handleSaveBonding('singleJobLimit', parseCurrencyInput(e.target.value))}
                  placeholder="10,000,000"
                  className="pl-7 font-mono"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="agg-bond">Aggregate Limit</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <Input
                  id="agg-bond"
                  value={organization.bonding.aggregateLimit ? formatCurrency(organization.bonding.aggregateLimit).replace('$', '') : ''}
                  onChange={(e) =>
                    updateOrganization({
                      bonding: { ...organization.bonding, aggregateLimit: parseCurrencyInput(e.target.value) },
                    })
                  }
                  onBlur={(e) => handleSaveBonding('aggregateLimit', parseCurrencyInput(e.target.value))}
                  placeholder="50,000,000"
                  className="pl-7 font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 6. Insurance Certificates ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={FileText} title="Insurance Certificates" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {organization.insuranceCerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="text-left py-2 pr-4 font-medium text-zinc-600">COI Name</th>
                    <th className="text-left py-2 pr-4 font-medium text-zinc-600">File</th>
                    <th className="text-left py-2 pr-4 font-medium text-zinc-600">Expiry Date</th>
                    <th className="text-left py-2 pr-4 font-medium text-zinc-600">Status</th>
                    <th className="text-right py-2 font-medium text-zinc-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organization.insuranceCerts.map((cert) => {
                    const status = certExpiryStatus(cert.expiryDate);
                    return (
                      <tr key={cert.id} className="border-b border-zinc-100 last:border-0">
                        <td className="py-3 pr-4 text-zinc-900 font-medium">{cert.name}</td>
                        <td className="py-3 pr-4">
                          <a
                            href={cert.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="date"
                            value={cert.expiryDate}
                            onChange={(e) => updateCertExpiry(cert.id, e.target.value)}
                            className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInsuranceCert(cert.id)}
                            className="text-zinc-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 mb-4">No certificates uploaded yet.</p>
          )}

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => coiInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Upload Certificate
            </Button>
            <input
              ref={coiInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addInsuranceCert(file);
                e.target.value = '';
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── 7. Federal Agency Relationships ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={Landmark} title="Federal Agency Relationships" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
            {FEDERAL_AGENCIES.map((agency) => (
              <label
                key={agency}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                  organization.federalAgencies.includes(agency)
                    ? 'border-orange-300 bg-orange-50 text-orange-800'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={organization.federalAgencies.includes(agency)}
                  onChange={() => toggleAgency(agency)}
                  className="w-4 h-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                />
                {agency}
              </label>
            ))}
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="agency-other">Other Agency</Label>
              <Input
                id="agency-other"
                value={agencyOther}
                onChange={(e) => setAgencyOther(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && agencyOther.trim()) {
                    e.preventDefault();
                    toggleAgency(agencyOther.trim().toUpperCase());
                    setAgencyOther('');
                  }
                }}
                placeholder="e.g. FEMA"
                className="mt-1"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (agencyOther.trim()) {
                  toggleAgency(agencyOther.trim().toUpperCase());
                  setAgencyOther('');
                }
              }}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 8. Geographic Service Areas ── */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            <SectionHeading icon={Globe} title="Geographic Service Areas" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <select
              value={serviceAreaSelect}
              onChange={(e) => {
                addServiceArea(e.target.value);
              }}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Select a state or territory</option>
              {US_STATES.filter((s) => !organization.serviceAreas.includes(s)).map((s) => (
                <option key={s} value={s}>
                  {STATE_NAMES[s]} ({s})
                </option>
              ))}
            </select>
          </div>

          {organization.serviceAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {organization.serviceAreas.map((state) => (
                <Badge
                  key={state}
                  variant="secondary"
                  className="gap-1 pl-2.5 pr-1.5 py-1"
                >
                  <MapPin className="w-3 h-3 text-orange-500" />
                  {STATE_NAMES[state] || state}
                  <button
                    type="button"
                    onClick={() => removeServiceArea(state)}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No service areas selected.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
