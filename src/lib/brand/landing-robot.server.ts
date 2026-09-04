import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Só em Server Components — o ficheiro vive em public/. */
export function landingRobotGlbExists(): boolean {
  return existsSync(join(process.cwd(), "public/landing/x09-robot.glb"));
}
