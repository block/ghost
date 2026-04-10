"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ValueDrift {
  token: string;
  rule: string;
  severity: string;
  message: string;
  registryValue?: string;
  consumerValue?: string;
  selector?: string;
}

interface StructureDrift {
  component: string;
  rule: string;
  severity: string;
  message: string;
  diff?: string;
  linesAdded: number;
  linesRemoved: number;
}

interface ScanReport {
  timestamp: string;
  systems: {
    designSystem: string;
    values: ValueDrift[];
    structure: StructureDrift[];
  }[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    tokensScanned: number;
    componentsScanned: number;
  };
}

function severityVariant(severity: string) {
  switch (severity) {
    case "error":
      return "destructive";
    case "warn":
      return "outline";
    default:
      return "secondary";
  }
}

export function ScanResults({ report }: { report: ScanReport }) {
  const system = report.systems[0];
  if (!system) return null;

  const allDrifts = [
    ...system.values.map((v) => ({
      type: "token" as const,
      name: v.token,
      rule: v.rule,
      severity: v.severity,
      message: v.message,
      registryValue: v.registryValue ?? "-",
      consumerValue: v.consumerValue ?? "-",
    })),
    ...system.structure.map((s) => ({
      type: "structure" as const,
      name: s.component,
      rule: s.rule,
      severity: s.severity,
      message: s.message,
      registryValue: s.linesAdded > 0 ? `+${s.linesAdded}` : "-",
      consumerValue: s.linesRemoved > 0 ? `-${s.linesRemoved}` : "-",
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">
            {report.summary.errors} errors
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">
            {report.summary.warnings} warnings
          </span>
        </div>
        <div className="text-muted-foreground">
          {report.summary.tokensScanned} tokens &middot;{" "}
          {report.summary.componentsScanned} components scanned
        </div>
      </div>

      <div className="rounded-lg border border-border-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Severity</TableHead>
              <TableHead className="w-[180px]">Rule</TableHead>
              <TableHead>Token / Component</TableHead>
              <TableHead>Registry</TableHead>
              <TableHead>Consumer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allDrifts.map((drift, i) => (
              <TableRow key={`${drift.rule}-${drift.name}-${i}`}>
                <TableCell>
                  <Badge variant={severityVariant(drift.severity)}>
                    {drift.severity}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {drift.rule}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {drift.name}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {drift.registryValue}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {drift.consumerValue}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
