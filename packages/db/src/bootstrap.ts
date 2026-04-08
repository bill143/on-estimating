// NEXUS Estimating — Dev Bootstrap (No Auth Required)
// Creates Organization + OrgMember with a dev user ID
// Run: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/bootstrap.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

// Dev-only placeholder user ID — replaced with real Supabase ID before go-live
const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('\n🌱 NEXUS Estimating — Dev Bootstrap\n');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'oneill-contractors' },
    update: {},
    create: {
      name: "O'Neill Contractors, Inc.",
      slug: 'oneill-contractors',
      settings: {
        federalContractor: true,
        certifications: ['8a', 'SDVOSB', 'WOSB'],
        clients: ['VA', 'NAVFAC', 'USACE', 'GSA', 'DHS'],
      },
    },
  });
  console.log(`✓ Organization: ${org.name}`);
  console.log(`  ID: ${org.id}`);

  // 2. OrgMember (dev placeholder — no real auth user needed)
  const member = await prisma.orgMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: DEV_USER_ID } },
    update: {},
    create: {
      organizationId: org.id,
      userId: DEV_USER_ID,
      role: 'OWNER',
      displayName: 'Bill Asmar',
    },
  });
  console.log(`✓ Member: ${member.displayName} (${member.role})`);

  // 3. Cost codes — federal construction core set
  console.log('\n  Seeding cost codes...');
  const codes = [
    { code: '01 50 00', desc: 'Temporary Facilities and Controls', div: '01', unit: 'LS', mat: 5000, lab: 3000, eq: 500 },
    { code: '03 10 00', desc: 'Concrete Forming', div: '03', unit: 'SFCA', mat: 4.50, lab: 8.75, eq: 0.75 },
    { code: '03 21 00', desc: 'Reinforcing Steel', div: '03', unit: 'TON', mat: 1450, lab: 680, eq: 120 },
    { code: '03 30 00', desc: 'Cast-in-Place Concrete', div: '03', unit: 'CY', mat: 185, lab: 95, eq: 35 },
    { code: '04 22 00', desc: 'Concrete Unit Masonry (CMU)', div: '04', unit: 'SF', mat: 3.85, lab: 8.50, eq: 1.25 },
    { code: '05 12 00', desc: 'Structural Steel Framing', div: '05', unit: 'TON', mat: 2800, lab: 1200, eq: 350 },
    { code: '05 30 00', desc: 'Steel Decking', div: '05', unit: 'SF', mat: 2.85, lab: 2.15, eq: 0.50 },
    { code: '07 21 00', desc: 'Thermal Insulation', div: '07', unit: 'SF', mat: 0.85, lab: 0.45, eq: 0.05 },
    { code: '07 50 00', desc: 'Membrane Roofing (TPO)', div: '07', unit: 'SF', mat: 2.75, lab: 2.25, eq: 0.35 },
    { code: '09 29 00', desc: 'Gypsum Board (5/8" Type X)', div: '09', unit: 'SF', mat: 0.85, lab: 1.15, eq: 0.10 },
    { code: '09 30 00', desc: 'Tiling (Porcelain 12x12)', div: '09', unit: 'SF', mat: 5.25, lab: 7.50, eq: 0.60 },
    { code: '09 65 00', desc: 'Resilient Flooring (LVT)', div: '09', unit: 'SF', mat: 4.25, lab: 2.80, eq: 0.20 },
    { code: '09 91 00', desc: 'Interior Painting (2-coat)', div: '09', unit: 'SF', mat: 0.35, lab: 0.65, eq: 0.05 },
    { code: '22 10 00', desc: 'Plumbing Piping (Copper)', div: '22', unit: 'LF', mat: 8.75, lab: 4.50, eq: 0.75 },
    { code: '22 40 00', desc: 'Plumbing Fixtures', div: '22', unit: 'EA', mat: 850, lab: 320, eq: 25 },
    { code: '23 00 00', desc: 'HVAC — Complete System (Sub)', div: '23', unit: 'LS', mat: 0, lab: 0, eq: 0 },
    { code: '23 34 00', desc: 'HVAC Ductwork (Sheet Metal)', div: '23', unit: 'LF', mat: 18.50, lab: 12.75, eq: 1.50 },
    { code: '26 00 00', desc: 'Electrical — Complete System (Sub)', div: '26', unit: 'LS', mat: 0, lab: 0, eq: 0 },
    { code: '26 51 00', desc: 'LED Interior Lighting', div: '26', unit: 'EA', mat: 85, lab: 45, eq: 4 },
    { code: '31 23 00', desc: 'Excavation — Bulk (Common Earth)', div: '31', unit: 'CY', mat: 0, lab: 1.85, eq: 3.75 },
    { code: '33 10 00', desc: 'Water Utilities (Ductile Iron 8")', div: '33', unit: 'LF', mat: 22.50, lab: 15.00, eq: 8.50 },
    { code: '33 30 00', desc: 'Sanitary Sewerage (PVC 8")', div: '33', unit: 'LF', mat: 14.50, lab: 10.50, eq: 5.25 },
  ];

  let seeded = 0;
  for (const c of codes) {
    await prisma.costCode.upsert({
      where: { organizationId_code: { organizationId: org.id, code: c.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: c.code,
        description: c.desc,
        csiDivision: c.div,
        unit: c.unit,
        unitCost: c.mat + c.lab + c.eq,
        materialRate: c.mat,
        laborRate: c.lab,
        equipmentRate: c.eq,
        isActive: true,
      },
    });
    seeded++;
  }
  console.log(`✓ ${seeded} cost codes seeded`);

  // 4. Demo project (so the projects page shows something immediately)
  const demoProject = await prisma.project.upsert({
    where: { id: 'demo-project-00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'demo-project-00000000-0000-0000-0000-000000000001',
      organizationId: org.id,
      name: 'VA Medical Center — Renovation Phase 1',
      number: '26001',
      description: 'Complete interior renovation of Building 18 including new surgical suite, patient rooms, and MEP upgrades. Federal Design-Build contract.',
      address: '3001 Green Bay Rd',
      city: 'North Chicago',
      state: 'IL',
      zipCode: '60064',
      clientName: 'Department of Veterans Affairs',
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Demo project: ${demoProject.name}`);

  console.log('\n✅ Bootstrap complete!\n');
  console.log('   → Open http://localhost:3000');
  console.log('   → You will see the dashboard');
  console.log('   → Projects page will show 1 demo project\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('\n❌ Bootstrap failed:', e.message, '\n');
    prisma.$disconnect();
    process.exit(1);
  });
