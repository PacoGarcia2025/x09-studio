import { getActiveSkills, getProductType, resolveSkillIds } from "@/lib/skills/registry";
import { isImobiliaria360, isLuxuryLight } from "@/lib/skills/detect";
import {
  ADMIN_DASHBOARD_BASE,
  BROKER_DASHBOARD_BASE,
  IMOBILIARIA_APP_TSX_RULES,
  LISTINGS_PAGE_BASE,
  OWNER_PORTAL_BASE,
  PROPERTIES_LIB_BASE,
  PROPERTY_DETAIL_BASE,
} from "@/lib/skills/imobiliaria-360";
import { LUXURY_LIGHT_BAR } from "@/lib/skills/luxury-light";
import { CINEMATIC_PREMIUM_BAR } from "@/lib/skills/premium-design";
import { pickTemplateProfile } from "@/lib/skills/templates/catalog";
import { templatePlannerAddon } from "@/lib/skills/templates/skill";
import type { ResolvedSkills } from "@/lib/skills/types";

const HOME_BASE = `Você gera a HomePage completa de um app Vite + React + TypeScript.
Responda APENAS JSON: { "content": string } com o arquivo TSX inteiro.

Regras OBRIGATÓRIAS:
- export function HomePage() { ... } (named export).
- NÃO use AppShell, router, next/*, nem "Meu App".
- Landing visualmente rica, pronta para conversão, em português do Brasil.
- Use Tailwind (className). Sem importar CSS/tailwindcss.
- Pode usar lucide-react e framer-motion.
- Conteúdo REAL do brief — nunca Lorem/Bem-vindo/página vazia.
- Aceite prop opcional onNavigateToLogin?: () => void e use no CTA "Entrar".
- CRÍTICO: TSX válido — feche todas as tags. Termine com } válido.`;

const LOGIN_BASE = `Você gera LoginPage completa (Vite + React + TypeScript + Supabase Auth).
Responda APENAS JSON: { "content": string }.
- export function LoginPage({ onNavigateHome, onNavigateApp }: { onNavigateHome?: () => void; onNavigateApp?: () => void })
- import { getSupabase } from "../lib/supabase"
- Sem next/*, sem AppShell, sem stub.`;

const DASHBOARD_BASE = `Você gera DashboardPage (área logada) Vite + React + TypeScript + Supabase.
Responda APENAS JSON: { "content": string }.
- export function DashboardPage({ onNavigateHome, onSignOut }: { onNavigateHome?: () => void; onSignOut?: () => void })
- import { getSupabase } from "../lib/supabase"
- Sem next/*, sem stub "em breve".`;

const FILE_BASE = `Você é o gerador de conteúdo de UMA única task do Builder X09 Studio.
Responda APENAS JSON: { "content": string }
- Gere só o conteúdo deste arquivo. Não explique.
- Stack: Vite + React + TypeScript (NÃO Next.js).`;

const APP_TSX_BASE = `Você gera src/App.tsx de um app Vite + React.
Responda APENAS JSON: { "content": string }.
- import { useState } from "react"
- HomePage + LoginPage (+ DashboardPage se SaaS)
- NÃO use AppShell / "Meu App".`;

function joinBlocks(blocks: string[]): string {
  return blocks.filter(Boolean).join("\n\n");
}

/**
 * Resolve skills ativas a partir do prompt/brief e monta prompts compostos.
 */
export function resolveSkills(prompt: string): ResolvedSkills {
  const skills = getActiveSkills(prompt);
  const ids = resolveSkillIds(prompt);
  const profile = pickTemplateProfile(prompt);
  const imob = isImobiliaria360(prompt);
  const luxury = isLuxuryLight(prompt);
  const visualBar = luxury ? LUXURY_LIGHT_BAR : CINEMATIC_PREMIUM_BAR;

  const plannerAddon = joinBlocks([
    templatePlannerAddon(prompt),
    ...skills.map((s) => (s.plannerRules ? `[${s.name}]\n${s.plannerRules}` : "")),
  ]);

  const fileSystemBase = joinBlocks([
    FILE_BASE,
    visualBar,
    ...skills.map((s) => s.builderFileRules),
  ]);

  const homePageSystem = joinBlocks([
    HOME_BASE,
    visualBar,
    ...skills.map((s) => s.homePageRules),
  ]);

  const loginPageSystem = joinBlocks([
    LOGIN_BASE,
    ...skills.map((s) => s.loginPageRules),
  ]);

  const dashboardPageSystem = joinBlocks([
    DASHBOARD_BASE,
    ...skills.map((s) => s.dashboardPageRules),
  ]);

  const editPatchRules = joinBlocks(skills.map((s) => s.editRules));

  return {
    ids,
    productType: getProductType(prompt),
    templateProfileId: profile.id,
    templateScaffoldId: profile.scaffoldId,
    plannerAddon,
    fileSystemBase,
    homePageSystem,
    loginPageSystem,
    dashboardPageSystem,
    listingsPageSystem: imob
      ? joinBlocks([LISTINGS_PAGE_BASE, visualBar])
      : FILE_BASE,
    propertyDetailPageSystem: imob
      ? joinBlocks([PROPERTY_DETAIL_BASE, visualBar])
      : FILE_BASE,
    brokerDashboardPageSystem: imob
      ? joinBlocks([BROKER_DASHBOARD_BASE, visualBar])
      : dashboardPageSystem,
    ownerPortalPageSystem: imob
      ? joinBlocks([OWNER_PORTAL_BASE, visualBar])
      : FILE_BASE,
    adminDashboardPageSystem: imob
      ? joinBlocks([ADMIN_DASHBOARD_BASE, visualBar])
      : FILE_BASE,
    propertiesLibSystem: imob ? PROPERTIES_LIB_BASE : FILE_BASE,
    appTsxRules: imob ? IMOBILIARIA_APP_TSX_RULES : APP_TSX_BASE,
    editPatchRules,
  };
}
