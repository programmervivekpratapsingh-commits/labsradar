import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const tests = [
  { name: "Complete Blood Count (CBC)", category: "Blood Test", description: "Measures red cells, white cells and platelets", preparation: "No fasting required", duration: "Report in 12 hours", basePrice: 400 },
  { name: "Lipid Profile", category: "Blood Test", description: "Cholesterol and triglycerides", preparation: "Fast for 9-12 hours", duration: "Report in 24 hours", basePrice: 700 },
  { name: "Blood Sugar (Fasting)", category: "Diabetes", description: "Fasting blood glucose level", preparation: "Fast for 8-10 hours", duration: "Report in 6 hours", basePrice: 120 },
  { name: "HbA1c", category: "Diabetes", description: "Average blood sugar over 3 months", preparation: "No fasting required", duration: "Report in 24 hours", basePrice: 500 },
  { name: "Thyroid Profile (T3, T4, TSH)", category: "Thyroid", description: "Checks thyroid gland function", preparation: "No fasting required", duration: "Report in 24 hours", basePrice: 650 },
  { name: "Liver Function Test (LFT)", category: "Blood Test", description: "Liver enzymes and proteins", preparation: "Fast for 8 hours", duration: "Report in 24 hours", basePrice: 800 },
  { name: "Kidney Function Test (KFT)", category: "Blood Test", description: "Creatinine, urea and electrolytes", preparation: "Fast for 8 hours", duration: "Report in 24 hours", basePrice: 850 },
  { name: "Vitamin D (25-OH)", category: "Vitamins", description: "Vitamin D level", preparation: "No fasting required", duration: "Report in 24 hours", basePrice: 1200 },
  { name: "Vitamin B12", category: "Vitamins", description: "Vitamin B12 level", preparation: "Fast for 6 hours", duration: "Report in 24 hours", basePrice: 900 },
  { name: "Urine Routine", category: "Urine Test", description: "Physical and chemical urine examination", preparation: "Collect a midstream morning sample", duration: "Report in 6 hours", basePrice: 150 },
  { name: "Dengue NS1 Antigen", category: "Infection", description: "Early detection of dengue", preparation: "No fasting required", duration: "Report in 12 hours", basePrice: 700 },
  { name: "Chest X-Ray (PA View)", category: "Imaging", description: "X-ray of the chest", preparation: "Remove metal objects near the chest", duration: "Report in 6 hours", basePrice: 350 },
];

const labs = [
  { name: "CityCare Diagnostics", address: "12 Link Road, Andheri West", city: "Mumbai", pincode: "400053", phone: "9000000001", email: "citycare@labsradar.com", nablNumber: "SAMPLE-NABL-001", managerName: "CityCare Manager", rating: 4.5, priceFactor: 1.0, discount: 20 },
  { name: "HealthFirst Labs", address: "45 Hill Road, Bandra West", city: "Mumbai", pincode: "400050", phone: "9000000002", email: "healthfirst@labsradar.com", nablNumber: "SAMPLE-NABL-002", managerName: "HealthFirst Manager", rating: 4.7, priceFactor: 1.1, discount: 25 },
  { name: "Apex Pathology", address: "8 Station Road, Thane West", city: "Thane", pincode: "400601", phone: "9000000003", email: "apex@labsradar.com", nablNumber: "SAMPLE-NABL-003", managerName: "Apex Manager", rating: 4.3, priceFactor: 0.9, discount: 15 },
];

async function main() {
  const adminHash = await bcrypt.hash("Admin12345", 12);
  const labHash = await bcrypt.hash("Lab12345", 12);

  await prisma.user.upsert({
    where: { email: "admin@labsradar.com" },
    update: {},
    create: { name: "LabsRadar Admin", email: "admin@labsradar.com", password: adminHash, role: "ADMIN" },
  });

  const testRecords: { id: string; basePrice: number }[] = [];
  for (const t of tests) {
    let record = await prisma.test.findFirst({ where: { name: t.name } });
    if (!record) {
      record = await prisma.test.create({
        data: { name: t.name, category: t.category, description: t.description, preparation: t.preparation, duration: t.duration },
      });
    }
    testRecords.push({ id: record.id, basePrice: t.basePrice });
  }

  for (const l of labs) {
    const manager = await prisma.user.upsert({
      where: { email: l.email.replace("@", "-manager@") },
      update: {},
      create: { name: l.managerName, email: l.email.replace("@", "-manager@"), password: labHash, role: "LAB" },
    });

    const lab = await prisma.lab.upsert({
      where: { email: l.email },
      update: {},
      create: {
        name: l.name, address: l.address, city: l.city, pincode: l.pincode, phone: l.phone,
        email: l.email, nablNumber: l.nablNumber, rating: l.rating,
        isApproved: true, managerId: manager.id,
      },
    });

    for (const t of testRecords) {
      const price = Math.round((t.basePrice * l.priceFactor) / 10) * 10;
      await prisma.labTest.upsert({
        where: { labId_testId: { labId: lab.id, testId: t.id } },
        update: {},
        create: { labId: lab.id, testId: t.id, price, discount: l.discount },
      });
    }
  }

  console.log("Seed complete: 1 admin, " + labs.length + " labs, " + tests.length + " tests");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
