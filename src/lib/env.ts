import "server-only";

export type DataBackend = "fs" | "github";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function getDataBackend(): DataBackend {
  // Em development sempre fs sob data-dev/, para não gravar no GitHub de produção.
  if (process.env.NODE_ENV === "development") return "fs";
  const raw = process.env.DATA_BACKEND?.trim().toLowerCase();
  if (raw === "github") return "github";
  if (raw === "fs" || !raw) return "fs";
  throw new Error(`Invalid DATA_BACKEND: ${raw}`);
}

export function getGithubConfig() {
  return {
    token: required("GITHUB_TOKEN", process.env.GITHUB_TOKEN),
    owner: required("GITHUB_OWNER", process.env.GITHUB_OWNER),
    repo: required("GITHUB_REPO", process.env.GITHUB_REPO),
    branch: process.env.GITHUB_BRANCH?.trim() || "main",
  };
}

export function getAuthEnv() {
  return {
    username: required("ADMIN_USERNAME", process.env.ADMIN_USERNAME),
    password: required("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD),
    jwtSecret: required("JWT_SECRET", process.env.JWT_SECRET),
    jwtTtl: process.env.JWT_TTL?.trim() || "8h",
  };
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
