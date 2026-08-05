import { NextResponse } from "next/server";

const PERSONAL_SITE =
  process.env.PERSONAL_SITE_URL ?? "https://hari-prakash-site-production.up.railway.app";

export const portfolioProjects = [
  {
    name: "Onco Care App",
    category: "Digital Health",
    status: "live",
    description: "mHealth platform for cancer patients — remote monitoring, symptom tracking, chemotherapy planning.",
    link: "https://onco-care.in/",
    site: PERSONAL_SITE,
  },
  {
    name: "Prama AI",
    category: "Research Tools",
    status: "live",
    description: "AI-assisted systematic review & meta-analysis platform with PRISMA workflow.",
    link: "https://www.pramanasrma.in/",
    railway: "Pramana",
  },
  {
    name: "Sangam NMA",
    category: "Research Tools",
    status: "live",
    description: "Network meta-analysis workbench with league tables and forest plots.",
    link: "https://sangam-web-production.up.railway.app",
    github: "https://github.com/Drhari730/sangam-nma",
  },
  {
    name: "Artha HE",
    category: "Health Economics",
    status: "live",
    description: "Costing, CEA/CUA, Markov modelling, PSA, and budget impact analysis.",
    link: "https://artha-he-production.up.railway.app",
    github: "https://github.com/Drhari730/artha-he",
  },
  {
    name: "VEDA",
    category: "Data Analysis",
    status: "development",
    description: "Visual Evidence and Data Analytics — general-purpose research data workbench.",
    link: "https://github.com/Drhari730/VEDA",
    railway: "veda-platform-staging",
  },
  {
    name: "Vichara QDA",
    category: "Qualitative Research",
    status: "live",
    description: "Qualitative data analysis — code transcripts, themes, publication-grade outputs.",
    link: "https://vicharaqda.in/",
    railway: "vichara-qda",
  },
  {
    name: "AikyaMind",
    category: "Mental Health",
    status: "live",
    description: "Adolescent mental health mHealth app with screening and counselling support.",
    link: PERSONAL_SITE,
  },
  {
    name: "BP-Mitra",
    category: "NCD Suite",
    status: "live",
    description: "Hypertension risk prediction and blood-pressure tracking.",
    link: "https://github.com/Drhari730/BP-Mitra",
  },
  {
    name: "Glydecare",
    category: "NCD Suite",
    status: "development",
    description: "Diabetes self-management — glucose logging, medication reminders, diet guidance.",
    link: PERSONAL_SITE,
    railway: "Glydecare",
  },
  {
    name: "CRISP",
    category: "Clinical AI",
    status: "live",
    description: "Colorectal Risk Intelligence & Screening Predictor.",
    link: "https://crisp_ai.oneapp.dev",
  },
];

export async function GET() {
  return NextResponse.json({
    personalSite: PERSONAL_SITE,
    profile: {
      name: "Dr G. Hari Prakash",
      title: "Assistant Professor, Public Health · MSRUAS, Bengaluru",
      email: "hariprakash607@gmail.com",
      publications: 43,
      tools: 10,
    },
    projects: portfolioProjects,
  });
}
