import "server-only";
import path from "path";

/** `data-dev` em development; `data` em production (seed versionado). */
export const DATA_DIR_NAME =
  process.env.NODE_ENV === "development" ? "data-dev" : "data";

/** Root absoluto dos JSON da loja (respeita `VINA_DATA_ROOT` em CLI/testes). */
export function getDataRoot(): string {
  if (process.env.VINA_DATA_ROOT) {
    return path.resolve(process.env.VINA_DATA_ROOT);
  }
  return path.join(process.cwd(), DATA_DIR_NAME);
}

/** @deprecated Prefer `getDataRoot()` — valor fixo no primeiro import do módulo. */
export const DATA_ROOT = getDataRoot();

export class InvalidPathError extends Error {
  code = "INVALID_PATH" as const;
  constructor(message = `Path fora de ${DATA_DIR_NAME}/`) {
    super(message);
    this.name = "InvalidPathError";
  }
}

/** Resolve path relativo a DATA_ROOT e bloqueia traversal. Retorna path absoluto. */
export function assertDataPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.split("/").some((p) => p === ".." || p === "")
  ) {
    throw new InvalidPathError();
  }
  if (path.isAbsolute(relativePath)) {
    throw new InvalidPathError();
  }
  const dataRoot = getDataRoot();
  const absolute = path.resolve(dataRoot, normalized);
  const rootResolved = path.resolve(dataRoot);
  if (
    absolute !== rootResolved &&
    !absolute.startsWith(rootResolved + path.sep)
  ) {
    throw new InvalidPathError();
  }
  return absolute;
}

/** Path relativo com barras `/` (sem prefixo data/). */
export function toPosixRelative(relativePath: string): string {
  assertDataPath(relativePath);
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function dataRepoPath(relativePath: string): string {
  return `data/${toPosixRelative(relativePath)}`;
}
