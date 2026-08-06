import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run seed");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      userName: "Dr. Hari Prakash",
      userTitle: "Assistant Professor, Public Health",
      institution: "MSRUAS, Bengaluru",
      email: "hariprakash607@gmail.com",
    },
    create: {
      id: "default",
      userName: "Dr. Hari Prakash",
      userTitle: "Assistant Professor, Public Health",
      institution: "MSRUAS, Bengaluru",
      email: "hariprakash607@gmail.com",
    },
  });

  console.log("App settings ready. No demo data seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
