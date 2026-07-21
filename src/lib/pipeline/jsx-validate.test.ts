import { describe, expect, it } from "vitest";
import {
  getTsxSyntaxIssues,
  hasValidTsxSyntax,
} from "@/lib/pipeline/jsx-validate";

const VALID = `export function HomePage() {
  return (
    <div>
      <a href="mailto:x@y.com">Email</a>
    </div>
  );
}`;

const TRUNCATED = `export function HomePage() {
  return (
    <footer>
      <Mail className="w-5 h-5" />
      <a
`;

describe("jsx-validate", () => {
  it("accepts valid TSX", () => {
    expect(hasValidTsxSyntax(VALID)).toBe(true);
  });

  it("rejects truncated JSX tag", () => {
    const issues = getTsxSyntaxIssues(TRUNCATED);
    expect(issues.length).toBeGreaterThan(0);
    expect(hasValidTsxSyntax(TRUNCATED)).toBe(false);
  });
});
