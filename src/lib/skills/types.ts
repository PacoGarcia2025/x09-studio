export type SkillId =
  | "x09-core"
  | "x09-landing-pages"
  | "x09-saas-builder"
  | "x09-visual-edits"
  | "x09-code-review"
  | "x09-templates"
  | "x09-seo-performance"
  | "x09-luxury-light"
  | "x09-imobiliaria-360"
  | "x09-enterprise-publish";

export type ProductType = "landing" | "saas" | "dashboard" | "mixed" | "portal";

export type SkillQualityIssue = {
  code: string;
  message: string;
  severity: "error" | "warn";
  penalty: number;
};

export type StudioSkill = {
  id: SkillId;
  name: string;
  /** Sempre ativa quando listada em resolved.ids */
  alwaysOn?: boolean;
  plannerRules: string;
  builderFileRules: string;
  homePageRules: string;
  loginPageRules: string;
  dashboardPageRules: string;
  editRules: string;
  /** Checks adicionais pós-build (home TSX + brief). */
  evaluateHome?: (
    home: string,
    brief: string,
  ) => SkillQualityIssue[];
};

export type ResolvedSkills = {
  ids: SkillId[];
  productType: ProductType;
  templateProfileId: string;
  templateScaffoldId: string;
  plannerAddon: string;
  fileSystemBase: string;
  homePageSystem: string;
  loginPageSystem: string;
  dashboardPageSystem: string;
  listingsPageSystem: string;
  propertyDetailPageSystem: string;
  brokerDashboardPageSystem: string;
  ownerPortalPageSystem: string;
  adminDashboardPageSystem: string;
  propertiesLibSystem: string;
  appTsxRules: string;
  editPatchRules: string;
};
