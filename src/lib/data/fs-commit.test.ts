import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  applyCommitFilesTransactional,
  resolveUnderRoot,
  snapshotCommitTargets,
} from "./fs-commit";
import type { FileChange } from "./types";

describe("fs-commit transactional batch", () => {
  it("applies writes and deletes atomically on success", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fs-commit-"));
    try {
      await fs.mkdir(path.join(root, "produtos"), { recursive: true });
      await fs.mkdir(path.join(root, "indices"), { recursive: true });
      await fs.writeFile(
        path.join(root, "produtos", "a.json"),
        '{"id":"a"}\n',
        "utf8",
      );

      const files: FileChange[] = [
        {
          path: "produtos/a.json",
          content: '{"id":"a","v":2}\n',
          encoding: "utf-8",
        },
        {
          path: "indices/produtos.json",
          content: '{"total":1}\n',
          encoding: "utf-8",
        },
        { path: "produtos/gone.json", delete: true },
      ];

      await applyCommitFilesTransactional(files, (rel) =>
        resolveUnderRoot(root, rel),
      );

      const entity = await fs.readFile(
        path.join(root, "produtos", "a.json"),
        "utf8",
      );
      const index = await fs.readFile(
        path.join(root, "indices", "produtos.json"),
        "utf8",
      );
      assert.match(entity, /"v":2/);
      assert.match(index, /"total":1/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rolls back prior writes when a later change fails", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fs-commit-"));
    try {
      await fs.mkdir(path.join(root, "produtos"), { recursive: true });
      const entityPath = path.join(root, "produtos", "a.json");
      await fs.writeFile(entityPath, '{"id":"a","v":1}\n', "utf8");

      // Second path nests under the entity file → mkdir fails mid-batch.
      const files: FileChange[] = [
        {
          path: "produtos/a.json",
          content: '{"id":"a","v":999}\n',
          encoding: "utf-8",
        },
        {
          path: "produtos/a.json/nested.json",
          content: '{"x":1}\n',
          encoding: "utf-8",
        },
      ];

      await assert.rejects(() =>
        applyCommitFilesTransactional(files, (rel) =>
          resolveUnderRoot(root, rel),
        ),
      );

      const entity = await fs.readFile(entityPath, "utf8");
      assert.match(entity, /"v":1/, "entity must roll back to pre-batch");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("snapshots missing paths as null previous", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fs-commit-"));
    try {
      const snaps = await snapshotCommitTargets(
        [{ path: "indices/new.json", content: "{}\n", encoding: "utf-8" }],
        (rel) => resolveUnderRoot(root, rel),
      );
      assert.equal(snaps.length, 1);
      assert.equal(snaps[0]!.previous, null);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
