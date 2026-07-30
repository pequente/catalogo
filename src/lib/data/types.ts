export type FileChange =
  | { path: string; content: string | Buffer; encoding?: "utf-8" | "base64" }
  | { path: string; delete: true };

export type WriteOpts = {
  expectedSha?: string;
  message?: string;
};

export type DeleteOpts = {
  expectedSha?: string;
  message?: string;
};

export type DataAdapter = {
  readJson<T>(relativePath: string): Promise<T | null>;
  listJsonDir(relativeDir: string): Promise<string[]>;
  writeJson(
    relativePath: string,
    data: unknown,
    opts?: WriteOpts,
  ): Promise<void>;
  deleteJson(relativePath: string, opts?: DeleteOpts): Promise<void>;
  readBinary(relativePath: string): Promise<Buffer | null>;
  writeBinary(
    relativePath: string,
    bytes: Buffer,
    opts?: WriteOpts,
  ): Promise<void>;
  commitFiles(files: FileChange[], message: string): Promise<void>;
  getFileSha?(relativePath: string): Promise<string | null>;
};
