#!/usr/bin/env tsx
/**
 * Generates a coverage badge SVG from vitest coverage JSON
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface FileCoverage {
  path: string;
  statementMap: Record<string, unknown>;
  fnMap: Record<string, unknown>;
  branchMap: Record<string, unknown>;
  s: Record<string, number>; // statement coverage
  f: Record<string, number>; // function coverage
  b: Record<string, number[]>; // branch coverage
}

type CoverageData = Record<string, FileCoverage>;

function calculateStatementCoverage(data: CoverageData): number {
  let totalStatements = 0;
  let coveredStatements = 0;

  for (const file of Object.values(data)) {
    const statements = file.s || {};
    totalStatements += Object.keys(statements).length;
    coveredStatements += Object.values(statements).filter((count) => count > 0).length;
  }

  const statementCoveragePercentage = () => {
    if (totalStatements === 0) return 0;
    return (coveredStatements / totalStatements) * 100;
  };
  const statementCoverage = statementCoveragePercentage();
  console.log(`Statement coverage: ${Number(statementCoverage.toFixed(2))}%`);

  return Number(statementCoverage.toFixed(2));
}

function getCoveragePercentage(): number {
  const coveragePath = join(process.cwd(), "coverage", "coverage-final.json");
  const coverageData = JSON.parse(readFileSync(coveragePath, "utf-8")) as CoverageData;
  return calculateStatementCoverage(coverageData);
}

function getBadgeColor(percentage: number): string {
  if (percentage >= 90) return "brightgreen";
  if (percentage >= 80) return "green";
  if (percentage >= 70) return "yellowgreen";
  if (percentage >= 60) return "yellow";
  if (percentage >= 50) return "orange";
  return "red";
}

async function fetchBadgeSVG(percentage: number): Promise<string> {
  const color = getBadgeColor(percentage);
  const url = `https://img.shields.io/badge/coverage-${percentage}%25-${color}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch badge: ${response.statusText}`);
  }
  return await response.text();
}

async function main() {
  try {
    const percentage = getCoveragePercentage();
    const badgeSVG = await fetchBadgeSVG(percentage);
    const badgePath = join(process.cwd(), "coverage-badge.svg");

    writeFileSync(badgePath, badgeSVG);
    console.log(`Coverage badge generated: ${percentage}%`);
  } catch (error) {
    console.error("Failed to generate coverage badge:", error);
    process.exit(1);
  }
}

main();
