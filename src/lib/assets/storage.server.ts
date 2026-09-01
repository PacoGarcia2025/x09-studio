import "server-only";
import type { AssetKind } from "@/lib/assets/kinds";
import { buildAssetRelativeFile } from "@/lib/assets/paths";
import { getAssetStorage } from "@/lib/storage/registry";

export async function writeAssetFile(input: {
  workspaceId: string;
  kind: AssetKind;
  assetId: string;
  extension: string;
  bytes: Uint8Array;
}): Promise<string> {
  const relative = buildAssetRelativeFile(
    input.workspaceId,
    input.kind,
    input.assetId,
    input.extension,
  );
  await getAssetStorage().writeFile(relative, input.bytes);
  return relative;
}

export async function readAssetFile(relativePath: string): Promise<Buffer> {
  return getAssetStorage().readFile(relativePath);
}

export async function removeAssetDir(
  workspaceId: string,
  kind: AssetKind,
  assetId: string,
): Promise<void> {
  await getAssetStorage().remove(`${workspaceId}/${kind}/${assetId}`);
}

export async function assetFileExists(relativePath: string): Promise<boolean> {
  return getAssetStorage().exists(relativePath);
}
