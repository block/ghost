"use client";

import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import { CompareView } from "@/components/playground/compare-view";
import { FingerprintRadar } from "@/components/playground/fingerprint-radar";
import { ScanResults } from "@/components/playground/scan-results";
import { TimelineView } from "@/components/playground/timeline-view";
import { TokenPanel } from "@/components/playground/token-panel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import comparisonData from "@/data/playground/comparison.json";
import consumerFp from "@/data/playground/consumer-fingerprint.json";
import registryFp from "@/data/playground/registry-fingerprint.json";
import scanReport from "@/data/playground/scan-report.json";
import temporalData from "@/data/playground/temporal.json";

export default function PlaygroundPage() {
  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Tools"
        title="Playground"
        description="Interactive demo of Ghost's drift detection, fingerprinting, and temporal tracking. All data is generated from test fixtures."
      />

      <Tabs defaultValue="scan" className="pb-16">
        <TabsList className="mb-8">
          <TabsTrigger value="scan">Scan Results</TabsTrigger>
          <TabsTrigger value="fingerprint">Fingerprint</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TokenPanel
              fingerprint={registryFp as never}
              label="Registry (Source of Truth)"
            />
            <TokenPanel
              fingerprint={consumerFp as never}
              label="Consumer (Drifted)"
              variant="drifted"
            />
          </div>
          <ScanResults report={scanReport as never} />
        </TabsContent>

        <TabsContent value="fingerprint">
          <FingerprintRadar comparison={comparisonData as never} />
        </TabsContent>

        <TabsContent value="compare">
          <CompareView comparison={comparisonData as never} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineView temporal={temporalData as never} />
        </TabsContent>
      </Tabs>
    </SectionWrapper>
  );
}
