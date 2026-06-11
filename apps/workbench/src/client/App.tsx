import {
  Badge,
  Button,
  FileTree,
  FileTreeFile,
  FileTreeFolder,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "ghost-ui";
import {
  AlertCircle,
  BookOpen,
  Braces,
  CheckCircle2,
  ChevronsUpDown,
  ClipboardList,
  FileSearch,
  FileText,
  Filter,
  GitCompare,
  Layers3,
  Play,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  WorkbenchAIConnectionTestResult,
  WorkbenchAILoopResult,
  WorkbenchAIProvider,
  WorkbenchAIReviewState,
  WorkbenchAISettings,
  WorkbenchAISettingsUpdate,
  WorkbenchContextSection,
  WorkbenchDriftDeskResult,
  WorkbenchDriftSample,
  WorkbenchEntrypoint,
  WorkbenchFingerprintPackageSummary,
  WorkbenchFingerprintRefSummary,
  WorkbenchFingerprintStackPreview,
  WorkbenchFingerprintStudioResult,
  WorkbenchGraphNode,
  WorkbenchInspectionResult,
  WorkbenchPromptInterpretation,
  WorkbenchPromptLabResult,
  WorkbenchPromptRunnerState,
  WorkbenchPromptSample,
  WorkbenchScenarioDetail,
  WorkbenchScenarioKind,
  WorkbenchScenarioSummary,
  WorkbenchTreeNode,
} from "../shared";
import {
  fetchAISettings,
  fetchFingerprintStudio,
  fetchScenario,
  fetchScenarios,
  inspectScenario,
  runAILoop,
  runDriftDesk,
  runPromptLab,
  saveAISettings,
  testAIConnection,
} from "./api";

const FILTERS: Array<{ label: string; value: "all" | WorkbenchScenarioKind }> =
  [
    { label: "All", value: "all" },
    { label: "Context", value: "context" },
    { label: "Review", value: "review" },
    { label: "Cache", value: "cache" },
  ];

const fonts = {
  mono: "font-[Cash_Sans_Mono,SFMono-Regular,Roboto_Mono,Consolas,ui-monospace,monospace]",
  sans: "font-[Cash_Sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe_UI,sans-serif]",
  wide: "font-[Cash_Sans_Wide,Cash_Sans,Inter,ui-sans-serif,system-ui,sans-serif]",
};

type WorkbenchMode = "prompt" | "context" | "drift" | "fingerprint";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function App() {
  const [scenarios, setScenarios] = useState<WorkbenchScenarioSummary[]>([]);
  const [selectedId, setSelectedId] = useState("path-matched-single-surface");
  const [mode, setMode] = useState<WorkbenchMode>("prompt");
  const [detail, setDetail] = useState<WorkbenchScenarioDetail | null>(null);
  const [result, setResult] = useState<WorkbenchInspectionResult | null>(null);
  const [promptResult, setPromptResult] =
    useState<WorkbenchPromptLabResult | null>(null);
  const [driftResult, setDriftResult] =
    useState<WorkbenchDriftDeskResult | null>(null);
  const [fingerprintResult, setFingerprintResult] =
    useState<WorkbenchFingerprintStudioResult | null>(null);
  const [aiSettings, setAISettings] = useState<WorkbenchAISettings | null>(
    null,
  );
  const [aiSettingsDraft, setAISettingsDraft] =
    useState<WorkbenchAISettingsUpdate>({});
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);
  const [aiTestResult, setAITestResult] =
    useState<WorkbenchAIConnectionTestResult | null>(null);
  const [aiLoopResult, setAILoopResult] =
    useState<WorkbenchAILoopResult | null>(null);
  const [filter, setFilter] = useState<"all" | WorkbenchScenarioKind>("all");
  const [query, setQuery] = useState("");
  const [promptSampleId, setPromptSampleId] = useState("");
  const [driftSampleId, setDriftSampleId] = useState("");
  const [promptText, setPromptText] = useState("");
  const [targetPaths, setTargetPaths] = useState("");
  const [diffText, setDiffText] = useState("");
  const [targetPathsDirty, setTargetPathsDirty] = useState(false);
  const [diffTextDirty, setDiffTextDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAIBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchScenarios()
      .then((items) => {
        if (cancelled) return;
        setScenarios(items);
        if (!items.some((item) => item.id === selectedId) && items[0]) {
          setSelectedId(items[0].id);
        }
      })
      .catch((err) => setError(messageFromError(err)));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    fetchAISettings()
      .then((settings) => {
        if (cancelled) return;
        setAISettings(settings);
        setAISettingsDraft(settingsDraftFrom(settings));
      })
      .catch((err) => setError(messageFromError(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchScenario(selectedId)
      .then(async (scenario) => {
        if (cancelled) return;
        const defaultSample = scenario.promptSamples[0];
        const defaultDriftSample = scenario.driftSamples[0];
        setDetail(scenario);
        setPromptSampleId(defaultSample?.id ?? "");
        setDriftSampleId(defaultDriftSample?.id ?? "");
        setPromptText(defaultSample?.prompt ?? "");
        setAILoopResult(null);
        setTargetPathsDirty(false);
        setDiffTextDirty(false);
        const [inspection, promptLab, driftDesk, fingerprintStudio] =
          await Promise.all([
            inspectScenario(selectedId),
            runPromptLab(selectedId, {
              ...(defaultSample ? { promptSampleId: defaultSample.id } : {}),
            }),
            runDriftDesk(selectedId, {
              ...(defaultDriftSample
                ? { driftSampleId: defaultDriftSample.id }
                : {}),
            }),
            fetchFingerprintStudio(selectedId),
          ]);
        if (cancelled) return;
        setResult(inspection);
        setPromptResult(promptLab);
        setDriftResult(driftDesk);
        setFingerprintResult(fingerprintStudio);
        setTargetPaths(promptLab.interpretation.targetPaths.join("\n"));
        setDiffText(
          driftDesk.diffText ?? promptLab.interpretation.diffText ?? "",
        );
      })
      .catch((err) => setError(messageFromError(err)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filteredScenarios = useMemo(
    () =>
      scenarios.filter((scenario) => {
        const matchesFilter = filter === "all" || scenario.kind === filter;
        const haystack = [
          scenario.title,
          scenario.kicker,
          scenario.lesson,
          scenario.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return matchesFilter && haystack.includes(query.toLowerCase());
      }),
    [filter, query, scenarios],
  );

  async function runInspection() {
    setLoading(true);
    setError(null);
    try {
      if (mode === "prompt") {
        const promptLab = await runPromptLab(selectedId, {
          ...(promptSampleId ? { promptSampleId } : {}),
          ...(!promptSampleId && promptText.trim() ? { promptText } : {}),
          ...(targetPathsDirty
            ? { targetPaths: parsePathLines(targetPaths) }
            : {}),
          ...(diffTextDirty ? { diffText } : {}),
        });
        setPromptResult(promptLab);
        setResult(promptLab.inspection);
        if (!targetPathsDirty) {
          setTargetPaths(promptLab.interpretation.targetPaths.join("\n"));
        }
        if (!diffTextDirty) {
          setDiffText(promptLab.interpretation.diffText ?? "");
        }
        return;
      }
      if (mode === "drift") {
        const driftDesk = await runDriftDesk(selectedId, {
          ...(driftSampleId ? { driftSampleId } : {}),
          ...(diffTextDirty ? { diffText } : {}),
        });
        setDriftResult(driftDesk);
        if (!diffTextDirty) {
          setDiffText(driftDesk.diffText);
        }
        return;
      }
      if (mode === "fingerprint") {
        setFingerprintResult(await fetchFingerprintStudio(selectedId));
        return;
      }
      const targetPathValues = targetPaths ? parsePathLines(targetPaths) : [];
      const inspection = await inspectScenario(selectedId, {
        ...(targetPathValues.length > 0
          ? { targetPaths: targetPathValues }
          : {}),
        ...(diffText.trim() ? { diffText } : {}),
      });
      setResult(inspection);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }

  async function runPromptAI() {
    setAIBusy(true);
    setError(null);
    try {
      const promptLab = await runPromptLab(selectedId, {
        ...(promptSampleId ? { promptSampleId } : {}),
        ...(!promptSampleId && promptText.trim() ? { promptText } : {}),
        ...(targetPathsDirty
          ? { targetPaths: parsePathLines(targetPaths) }
          : {}),
        ...(diffTextDirty ? { diffText } : {}),
        runAI: true,
      });
      setPromptResult(promptLab);
      setResult(promptLab.inspection);
      if (!targetPathsDirty) {
        setTargetPaths(promptLab.interpretation.targetPaths.join("\n"));
      }
      if (!diffTextDirty) {
        setDiffText(promptLab.interpretation.diffText ?? "");
      }
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setAIBusy(false);
    }
  }

  async function runFullLoop() {
    setAIBusy(true);
    setError(null);
    try {
      const loop = await runAILoop(selectedId, {
        ...(promptSampleId ? { promptSampleId } : {}),
        ...(!promptSampleId && promptText.trim() ? { promptText } : {}),
        ...(targetPathsDirty
          ? { targetPaths: parsePathLines(targetPaths) }
          : {}),
        ...(diffTextDirty ? { diffText } : {}),
      });
      setAILoopResult(loop);
      setPromptResult(loop.promptLab);
      setResult(loop.promptLab.inspection);
      if (loop.checkReport) {
        setDriftResult({
          scenario: loop.scenario,
          diffText: loop.virtualPatch?.diffText ?? "",
          contexts: loop.contexts,
          checkReport: loop.checkReport,
          reviewPacket: loop.reviewPacket,
          reviewPacketMarkdown: loop.reviewPacketMarkdown ?? "",
          aiReview: loop.aiReview ?? {
            state: "not_configured",
            provider: "none",
            message: "AI review was not run.",
            findings: [],
          },
          stance: loop.stance ?? {
            state: "preview-only",
            recommendation: "needs-human-stance",
            summary: "AI loop did not produce a stance preview.",
            blockingSignals: 0,
            advisorySignals: 0,
            disabledActions: ["ack", "track", "diverge"],
            writes: [],
          },
        });
      }
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setAIBusy(false);
    }
  }

  async function saveAISettingsFromDraft() {
    setAIBusy(true);
    setError(null);
    try {
      const settings = await saveAISettings(aiSettingsDraft);
      setAISettings(settings);
      setAISettingsDraft(settingsDraftFrom(settings));
      setAITestResult(null);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setAIBusy(false);
    }
  }

  async function testAISettingsFromDraft() {
    setAIBusy(true);
    setError(null);
    try {
      setAITestResult(await testAIConnection(aiSettingsDraft));
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setAIBusy(false);
    }
  }

  const activeResult =
    mode === "prompt" ? (promptResult?.inspection ?? result) : result;
  const activeContexts =
    mode === "drift"
      ? (driftResult?.contexts ?? [])
      : (activeResult?.contexts ?? []);
  const activeContext = activeContexts[0] ?? null;
  const statusCount =
    mode === "fingerprint"
      ? (fingerprintResult?.packages.length ?? 0)
      : activeContexts.length;
  const selectedPromptSample =
    detail?.promptSamples.find((sample) => sample.id === promptSampleId) ??
    null;
  const selectedDriftSample =
    detail?.driftSamples.find((sample) => sample.id === driftSampleId) ?? null;

  function handlePromptSampleChange(sampleId: string) {
    const sample = detail?.promptSamples.find((item) => item.id === sampleId);
    setPromptSampleId(sampleId);
    setPromptText(sample?.prompt ?? "");
    setTargetPathsDirty(false);
    setDiffTextDirty(false);
  }

  function handlePromptTextChange(value: string) {
    setPromptText(value);
    setPromptSampleId("");
  }

  function handleDriftSampleChange(sampleId: string) {
    const sample = detail?.driftSamples.find((item) => item.id === sampleId);
    setDriftSampleId(sampleId);
    setDiffText(sample?.diffText ?? "");
    setDiffTextDirty(false);
  }

  return (
    <div
      className={cx(
        fonts.sans,
        "flex h-screen min-h-screen flex-col bg-[#faf9f6] text-[#24231f] antialiased selection:bg-[#24231f] selection:text-[#faf9f6]",
      )}
    >
      <header className="shrink-0 border-b border-[#e5ded2] bg-[#faf9f6]">
        <div className="flex min-h-[84px] items-center justify-between gap-6 px-6 py-4">
          <div className="min-w-0">
            <div
              className={cx(
                fonts.mono,
                "flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
              )}
            >
              <span
                className="inline-block size-1.5 rounded-full bg-[#b84a32] shadow-[0_0_0_3px_rgb(184_74_50_/_10%)]"
                aria-hidden="true"
              />
              Ghost Workbench
            </div>
            <h1
              className={cx(
                fonts.sans,
                "mt-1 text-2xl font-semibold leading-none text-[#24231f]",
              )}
            >
              {mode === "prompt"
                ? "Prompt Lab"
                : mode === "drift"
                  ? "Drift Desk"
                  : mode === "fingerprint"
                    ? "Fingerprint Studio"
                    : "Context inspector"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-2 flex rounded-md border border-[#d8cfbf] bg-white p-0.5">
              {(["prompt", "drift", "fingerprint", "context"] as const).map(
                (item) => (
                  <button
                    className={cx(
                      fonts.mono,
                      "rounded-[4px] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
                      mode === item
                        ? "bg-[#24231f] text-[#faf9f6]"
                        : "text-[#746f66] hover:text-[#24231f]",
                    )}
                    key={item}
                    onClick={() => setMode(item)}
                    type="button"
                  >
                    {item === "prompt"
                      ? "Prompt Lab"
                      : item === "drift"
                        ? "Drift Desk"
                        : item === "fingerprint"
                          ? "Studio"
                          : "Inspector"}
                  </button>
                ),
              )}
            </div>
            <StatusBadge
              checkResult={
                mode === "drift" ? driftResult?.checkReport.result : undefined
              }
              count={statusCount}
              loading={loading}
              unit={mode === "fingerprint" ? "package" : "context"}
            />
            <AIStatusBadge busy={aiBusy} settings={aiSettings} />
            <Button
              className="h-9 gap-2 rounded-md border border-[#d8cfbf] bg-white px-3 text-[#24231f] shadow-none hover:border-[#cbbfaf] hover:bg-[#f7f4ee]"
              onClick={() => setAISettingsOpen((open) => !open)}
              type="button"
            >
              <Settings className="size-4" />
              AI settings
            </Button>
            <Button
              className="h-9 gap-2 rounded-md border border-[#d8cfbf] bg-white px-3 text-[#24231f] shadow-none hover:border-[#cbbfaf] hover:bg-[#f7f4ee]"
              disabled={loading || !detail}
              onClick={runInspection}
              type="button"
            >
              {loading ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {mode === "prompt"
                ? "Run prompt"
                : mode === "drift"
                  ? "Review drift"
                  : mode === "fingerprint"
                    ? "Load studio"
                    : "Inspect"}
            </Button>
            {mode === "prompt" ? (
              <>
                <Button
                  className="h-9 gap-2 rounded-md border border-[#d8cfbf] bg-white px-3 text-[#24231f] shadow-none hover:border-[#cbbfaf] hover:bg-[#f7f4ee]"
                  disabled={aiBusy || loading || !detail}
                  onClick={runPromptAI}
                  type="button"
                >
                  {aiBusy ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Run AI
                </Button>
                <Button
                  className="h-9 gap-2 rounded-md bg-[#24231f] px-3 text-[#faf9f6] shadow-none hover:bg-[#3a3832]"
                  disabled={aiBusy || loading || !detail}
                  onClick={runFullLoop}
                  type="button"
                >
                  {aiBusy ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <GitCompare className="size-4" />
                  )}
                  Run full loop
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {aiSettingsOpen ? (
        <AISettingsPanel
          busy={aiBusy}
          draft={aiSettingsDraft}
          onDraftChange={setAISettingsDraft}
          onSave={saveAISettingsFromDraft}
          onTest={testAISettingsFromDraft}
          settings={aiSettings}
          testResult={aiTestResult}
        />
      ) : null}

      {error ? (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-[#d9a091] bg-[#fff7f4] p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#b84a32]" />
          <p>{error}</p>
        </div>
      ) : null}

      <ResizablePanelGroup className="min-h-0 flex-1">
        <ResizablePanel defaultSize={24} minSize={18}>
          <ScenarioSidebar
            filter={filter}
            onFilterChange={setFilter}
            onQueryChange={setQuery}
            onSelect={setSelectedId}
            query={query}
            scenarios={filteredScenarios}
            selectedId={selectedId}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={43} minSize={30}>
          <InspectorCenter
            detail={detail}
            diffText={diffText}
            loading={loading}
            mode={mode}
            onDiffTextChange={(value) => {
              setDiffText(value);
              setDiffTextDirty(true);
            }}
            onPromptSampleChange={handlePromptSampleChange}
            onPromptTextChange={handlePromptTextChange}
            onDriftSampleChange={handleDriftSampleChange}
            onTargetPathsChange={(value) => {
              setTargetPaths(value);
              setTargetPathsDirty(true);
            }}
            driftResult={driftResult}
            driftSampleId={driftSampleId}
            fingerprintResult={fingerprintResult}
            promptResult={promptResult}
            promptSampleId={promptSampleId}
            promptText={promptText}
            result={activeResult}
            selectedDriftSample={selectedDriftSample}
            selectedPromptSample={selectedPromptSample}
            targetPaths={targetPaths}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={33} minSize={25}>
          <RightRail
            aiLoopResult={aiLoopResult}
            context={activeContext}
            driftResult={driftResult}
            fingerprintResult={fingerprintResult}
            mode={mode}
            promptResult={promptResult}
            result={activeResult}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function AISettingsPanel({
  settings,
  draft,
  testResult,
  busy,
  onDraftChange,
  onSave,
  onTest,
}: {
  settings: WorkbenchAISettings | null;
  draft: WorkbenchAISettingsUpdate;
  testResult: WorkbenchAIConnectionTestResult | null;
  busy: boolean;
  onDraftChange: (value: WorkbenchAISettingsUpdate) => void;
  onSave: () => void;
  onTest: () => void;
}) {
  if (!settings) {
    return (
      <section className="shrink-0 border-b border-[#e5ded2] bg-white px-6 py-4 text-sm text-[#746f66]">
        Loading AI settings...
      </section>
    );
  }

  const provider = draft.provider ?? settings.provider;
  const providerDefault =
    settings.defaults.find((item) => item.provider === provider) ??
    settings.defaults[0];

  return (
    <section className="shrink-0 border-b border-[#e5ded2] bg-white px-6 py-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span
              className={cx(
                fonts.mono,
                "mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
              )}
            >
              Provider
            </span>
            <select
              className="h-10 w-full rounded-md border border-[#ded6c9] bg-[#fbfaf7] px-3 text-sm text-[#24231f] outline-none focus:border-[#d88f7b]"
              onChange={(event) => {
                const nextProvider = event.target.value as WorkbenchAIProvider;
                const nextDefault =
                  settings.defaults.find(
                    (item) => item.provider === nextProvider,
                  ) ?? providerDefault;
                onDraftChange({
                  ...draft,
                  provider: nextProvider,
                  model: nextDefault.model,
                  baseUrl: nextDefault.baseUrl,
                });
              }}
              value={provider}
            >
              {settings.defaults.map((item) => (
                <option key={item.provider} value={item.provider}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span
              className={cx(
                fonts.mono,
                "mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
              )}
            >
              Model
            </span>
            <input
              className="h-10 w-full rounded-md border border-[#ded6c9] bg-[#fbfaf7] px-3 text-sm text-[#24231f] outline-none focus:border-[#d88f7b]"
              onChange={(event) =>
                onDraftChange({ ...draft, model: event.target.value })
              }
              value={draft.model ?? settings.model}
            />
          </label>
          <label className="block xl:col-span-2">
            <span
              className={cx(
                fonts.mono,
                "mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
              )}
            >
              Base URL
            </span>
            <input
              className="h-10 w-full rounded-md border border-[#ded6c9] bg-[#fbfaf7] px-3 text-sm text-[#24231f] outline-none focus:border-[#d88f7b]"
              onChange={(event) =>
                onDraftChange({ ...draft, baseUrl: event.target.value })
              }
              value={draft.baseUrl ?? settings.baseUrl}
            />
          </label>
          <label className="block">
            <span
              className={cx(
                fonts.mono,
                "mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
              )}
            >
              Timeout ms
            </span>
            <input
              className="h-10 w-full rounded-md border border-[#ded6c9] bg-[#fbfaf7] px-3 text-sm text-[#24231f] outline-none focus:border-[#d88f7b]"
              max={120_000}
              min={1_000}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  timeoutMs: Number(event.target.value),
                })
              }
              type="number"
              value={draft.timeoutMs ?? settings.timeoutMs}
            />
          </label>
          <label className="block md:col-span-2 xl:col-span-5">
            <span
              className={cx(
                fonts.mono,
                "mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
              )}
            >
              API key
            </span>
            <input
              className="h-10 w-full rounded-md border border-[#ded6c9] bg-[#fbfaf7] px-3 text-sm text-[#24231f] outline-none focus:border-[#d88f7b]"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  apiKey: event.target.value || undefined,
                })
              }
              placeholder={
                settings.apiKeyConfigured
                  ? `Configured from ${settings.apiKeySource ?? "workbench"}; leave blank to preserve`
                  : providerDefault.requiresApiKey
                    ? "Paste a provider key; it stays server-side in .env.local"
                    : "Optional for local provider"
              }
              type="password"
              value={draft.apiKey ?? ""}
            />
          </label>
        </div>
        <div className="flex min-w-[220px] flex-col justify-between gap-3 rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge
                className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
                variant="secondary"
              >
                {settings.state}
              </Badge>
              <Badge
                className="rounded-md border-[#e5ded2] bg-transparent font-mono text-[10px] uppercase text-[#746f66]"
                variant="outline"
              >
                key {settings.apiKeyConfigured ? "set" : "missing"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#5e584f]">
              {testResult?.message ?? settings.message}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="h-9 flex-1 gap-2 rounded-md border border-[#d8cfbf] bg-white px-3 text-[#24231f] shadow-none hover:border-[#cbbfaf] hover:bg-[#f7f4ee]"
              disabled={busy}
              onClick={onTest}
              type="button"
            >
              {busy ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Test
            </Button>
            <Button
              className="h-9 flex-1 rounded-md bg-[#24231f] px-3 text-[#faf9f6] shadow-none hover:bg-[#3a3832]"
              disabled={busy}
              onClick={onSave}
              type="button"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScenarioSidebar({
  scenarios,
  selectedId,
  filter,
  query,
  onFilterChange,
  onQueryChange,
  onSelect,
}: {
  scenarios: WorkbenchScenarioSummary[];
  selectedId: string;
  filter: "all" | WorkbenchScenarioKind;
  query: string;
  onFilterChange: (value: "all" | WorkbenchScenarioKind) => void;
  onQueryChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  return (
    <aside className="flex h-full flex-col border-r border-[#e5ded2] bg-[#faf9f6]">
      <div className="space-y-4 border-b border-[#e5ded2] p-5">
        <label className="flex h-10 items-center gap-2 rounded-md border border-[#ded6c9] bg-white px-3 text-sm">
          <Search className="size-4 text-[#8a8378]" />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9b9489]"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search scenarios"
            value={query}
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <button
              className={cx(
                fonts.mono,
                `rounded-md border px-2.5 py-1.5 text-[11px] font-medium uppercase transition-colors ${
                  filter === item.value
                    ? "border-[#d8cfbf] bg-white text-[#24231f]"
                    : "border-transparent bg-transparent text-[#746f66] hover:border-[#e5ded2] hover:bg-white hover:text-[#24231f]"
                }`,
              )}
              key={item.value}
              onClick={() => onFilterChange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div
          className={cx(
            fonts.mono,
            "mb-3 flex items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
          )}
        >
          <Filter className="size-3.5" />
          Scenarios
        </div>
        <div className="space-y-2">
          {scenarios.map((scenario) => (
            <button
              className={`w-full rounded-md border p-4 text-left transition-colors ${
                selectedId === scenario.id
                  ? "border-[#d8cfbf] bg-white shadow-[inset_2px_0_0_#d88f7b]"
                  : "border-transparent bg-transparent hover:border-[#e5ded2] hover:bg-white"
              }`}
              key={scenario.id}
              onClick={() => onSelect(scenario.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cx(
                    fonts.mono,
                    "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
                  )}
                >
                  {scenario.kicker}
                </span>
                <Badge
                  className="rounded-md border-[#e5ded2] bg-transparent font-mono text-[10px] uppercase text-[#746f66]"
                  variant="outline"
                >
                  {scenario.kind}
                </Badge>
              </div>
              <div
                className={cx(
                  fonts.sans,
                  "mt-2 text-sm font-semibold leading-tight text-[#24231f]",
                )}
              >
                {scenario.title}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#746f66]">
                {scenario.lesson}
              </p>
              <div
                className={cx(
                  fonts.mono,
                  "mt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-[#8c857a]",
                )}
              >
                {scenario.promptSampleCount} prompt
                {scenario.promptSampleCount === 1 ? "" : "s"}
                {" / "}
                {scenario.driftSampleCount} drift
                {" / "}
                {scenario.fingerprintPackageCount} pkg
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function InspectorCenter({
  detail,
  result,
  loading,
  mode,
  driftResult,
  driftSampleId,
  fingerprintResult,
  promptResult,
  promptSampleId,
  promptText,
  selectedDriftSample,
  selectedPromptSample,
  targetPaths,
  diffText,
  onDriftSampleChange,
  onPromptSampleChange,
  onPromptTextChange,
  onTargetPathsChange,
  onDiffTextChange,
}: {
  detail: WorkbenchScenarioDetail | null;
  result: WorkbenchInspectionResult | null;
  loading: boolean;
  mode: WorkbenchMode;
  driftResult: WorkbenchDriftDeskResult | null;
  driftSampleId: string;
  fingerprintResult: WorkbenchFingerprintStudioResult | null;
  promptResult: WorkbenchPromptLabResult | null;
  promptSampleId: string;
  promptText: string;
  selectedDriftSample: WorkbenchDriftSample | null;
  selectedPromptSample: WorkbenchPromptSample | null;
  targetPaths: string;
  diffText: string;
  onDriftSampleChange: (value: string) => void;
  onPromptSampleChange: (value: string) => void;
  onPromptTextChange: (value: string) => void;
  onTargetPathsChange: (value: string) => void;
  onDiffTextChange: (value: string) => void;
}) {
  const contexts =
    mode === "drift" ? (driftResult?.contexts ?? []) : (result?.contexts ?? []);

  return (
    <main className="flex h-full min-w-0 flex-col overflow-hidden bg-[#fbfaf7]">
      <div className="border-b border-[#e5ded2] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className={cx(
                fonts.mono,
                "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
              )}
            >
              {detail?.kicker ?? "Scenario"}
            </div>
            <h2
              className={cx(
                fonts.sans,
                "mt-2 text-2xl font-semibold leading-tight text-[#24231f]",
              )}
            >
              {detail?.title ?? "Loading scenario"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#746f66]">
              {detail?.description}
            </p>
          </div>
          {result?.deterministic ? (
            <Badge
              className="mt-1 gap-1.5 rounded-md border-[#d8cfbf] bg-white text-[#24231f]"
              variant={result.deterministic.equal ? "default" : "destructive"}
            >
              <CheckCircle2 className="size-3.5" />
              Deterministic
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <PanelTitle icon={<FileSearch className="size-4" />} title="Repo" />
            {detail ? (
              <TreeView tree={detail.repoTree} />
            ) : (
              <div className="h-56 rounded-md border border-[#e5ded2] bg-white" />
            )}
          </div>
          <div className="space-y-4">
            <PanelTitle icon={<Braces className="size-4" />} title="Inputs" />
            {mode === "prompt" ? (
              <PromptLabInputs
                detail={detail}
                interpretation={promptResult?.interpretation ?? null}
                onPromptSampleChange={onPromptSampleChange}
                onPromptTextChange={onPromptTextChange}
                promptSampleId={promptSampleId}
                promptText={promptText}
                selectedPromptSample={selectedPromptSample}
              />
            ) : null}
            {mode === "drift" ? (
              <DriftDeskInputs
                detail={detail}
                driftSampleId={driftSampleId}
                onDriftSampleChange={onDriftSampleChange}
                selectedDriftSample={selectedDriftSample}
              />
            ) : null}
            {mode === "fingerprint" ? (
              <FingerprintStudioInputs result={fingerprintResult} />
            ) : null}
            {mode === "context" ? (
              <label className="block">
                <span
                  className={cx(
                    fonts.mono,
                    "mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
                  )}
                >
                  Target paths
                </span>
                <textarea
                  className="h-24 w-full resize-none rounded-md border border-[#e5ded2] bg-white p-4 font-mono text-xs text-[#24231f] outline-none transition-colors placeholder:text-[#9b9489] focus:border-[#d88f7b]"
                  onChange={(event) => onTargetPathsChange(event.target.value)}
                  value={targetPaths}
                />
              </label>
            ) : null}
            {mode === "prompt" ? (
              <label className="block">
                <span
                  className={cx(
                    fonts.mono,
                    "mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
                  )}
                >
                  Interpreted target paths
                </span>
                <textarea
                  className="h-24 w-full resize-none rounded-md border border-[#e5ded2] bg-white p-4 font-mono text-xs text-[#24231f] outline-none transition-colors placeholder:text-[#9b9489] focus:border-[#d88f7b]"
                  onChange={(event) => onTargetPathsChange(event.target.value)}
                  value={targetPaths}
                />
              </label>
            ) : null}
            {mode !== "fingerprint" ? (
              <label className="block">
                <span
                  className={cx(
                    fonts.mono,
                    "mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
                  )}
                >
                  {mode === "prompt"
                    ? "Interpreted diff text"
                    : mode === "drift"
                      ? "Review diff"
                      : "Diff text"}
                </span>
                <textarea
                  className="h-40 w-full resize-none rounded-md border border-[#e5ded2] bg-white p-4 font-mono text-xs text-[#24231f] outline-none transition-colors placeholder:text-[#9b9489] focus:border-[#d88f7b]"
                  onChange={(event) => onDiffTextChange(event.target.value)}
                  placeholder="Optional unified diff"
                  value={diffText}
                />
              </label>
            ) : null}
          </div>
        </section>

        {mode === "drift" && driftResult ? (
          <section className="mt-8 space-y-4">
            <PanelTitle
              icon={<ClipboardList className="size-4" />}
              title="Deterministic check"
            />
            <DriftReportPanel result={driftResult} />
          </section>
        ) : null}

        <section className="mt-8 space-y-4">
          {mode === "fingerprint" ? (
            <FingerprintRefIndex result={fingerprintResult} />
          ) : (
            <>
              <PanelTitle
                icon={<Layers3 className="size-4" />}
                title="Context"
              />
              {loading && !contexts.length ? (
                <div className="rounded-md border border-[#e5ded2] bg-white p-5 text-sm text-[#746f66]">
                  Resolving scenario...
                </div>
              ) : (
                contexts.map((context) => (
                  <ContextCard context={context} key={context.id} />
                ))
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function DriftDeskInputs({
  detail,
  driftSampleId,
  selectedDriftSample,
  onDriftSampleChange,
}: {
  detail: WorkbenchScenarioDetail | null;
  driftSampleId: string;
  selectedDriftSample: WorkbenchDriftSample | null;
  onDriftSampleChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-[#e5ded2] bg-white p-4">
      <label className="block">
        <span
          className={cx(
            fonts.mono,
            "mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
          )}
        >
          Drift sample
        </span>
        <select
          className="h-10 w-full rounded-md border border-[#ded6c9] bg-[#fbfaf7] px-3 text-sm text-[#24231f] outline-none focus:border-[#d88f7b]"
          onChange={(event) => onDriftSampleChange(event.target.value)}
          value={driftSampleId}
        >
          <option value="">Custom drift diff</option>
          {detail?.driftSamples.map((sample) => (
            <option key={sample.id} value={sample.id}>
              {sample.title}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <PromptNote
          label="Expected signal"
          value={selectedDriftSample?.expectedSignal ?? "custom"}
        />
        <PromptNote
          label="Lesson"
          value={
            selectedDriftSample?.lesson ??
            "Custom diffs stay inside the canned sandbox and never mutate repo files."
          }
        />
      </div>
    </div>
  );
}

function FingerprintStudioInputs({
  result,
}: {
  result: WorkbenchFingerprintStudioResult | null;
}) {
  const packages = result?.packages ?? [];
  return (
    <div className="space-y-3 rounded-md border border-[#e5ded2] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className={cx(
              fonts.mono,
              "text-[11px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
            )}
          >
            Discovered packages
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[#5e584f]">
            Read-only package inspection from the canned sandbox.
          </p>
        </div>
        <Badge
          className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
          variant="secondary"
        >
          {packages.length} package{packages.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="grid gap-3">
        {packages.map((pkg) => (
          <div
            className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-4"
            key={pkg.packageDir}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="break-all font-mono text-xs font-medium text-[#24231f]">
                {pkg.packageDir}
              </div>
              <Badge
                className="rounded-md font-mono text-[10px] uppercase"
                variant={
                  pkg.health.status === "error"
                    ? "destructive"
                    : pkg.health.status === "warning"
                      ? "outline"
                      : "secondary"
                }
              >
                {pkg.health.status}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <PromptNote label="Product" value={pkg.product ?? "Unnamed"} />
              <PromptNote label="Refs" value={String(pkg.refs.length)} />
              <PromptNote
                label="Active checks"
                value={String(pkg.counts.activeChecks)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FingerprintRefIndex({
  result,
}: {
  result: WorkbenchFingerprintStudioResult | null;
}) {
  const refs = result?.packages.flatMap((pkg) => pkg.refs) ?? [];
  const groups: Array<{
    title: string;
    value: WorkbenchFingerprintRefSummary["group"];
  }> = [
    { title: "Prose refs", value: "prose" },
    { title: "Inventory refs", value: "inventory" },
    { title: "Composition refs", value: "composition" },
    { title: "Check refs", value: "checks" },
  ];

  return (
    <>
      <PanelTitle icon={<BookOpen className="size-4" />} title="Ref index" />
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((group) => (
          <FingerprintRefGroup
            key={group.value}
            refs={refs.filter((ref) => ref.group === group.value)}
            title={group.title}
          />
        ))}
      </div>
    </>
  );
}

function FingerprintRefGroup({
  title,
  refs,
}: {
  title: string;
  refs: WorkbenchFingerprintRefSummary[];
}) {
  return (
    <div className="rounded-md border border-[#e5ded2] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h4
          className={cx(
            fonts.mono,
            "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
          )}
        >
          {title}
        </h4>
        <span className="font-mono text-xs text-[#8a8378]">{refs.length}</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {refs.length > 0 ? (
          refs.map((ref) => (
            <div
              className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-4"
              key={`${ref.packageDir}:${ref.ref}`}
            >
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  className="max-w-full break-all rounded-md border-[#e5ded2] bg-white font-mono text-[10px] text-[#5e584f]"
                  variant="outline"
                >
                  {ref.ref}
                </Badge>
                {ref.status ? (
                  <Badge
                    className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
                    variant="secondary"
                  >
                    {ref.status}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#24231f]">
                {ref.summary}
              </p>
              <div className="mt-2 break-all font-mono text-[11px] text-[#8a8378]">
                {ref.packageDir} / {ref.sourceFile} / refs in:{" "}
                {ref.referenceCount}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-4 text-sm text-[#746f66]">
            No refs in this group.
          </p>
        )}
      </div>
    </div>
  );
}

function DriftReportPanel({ result }: { result: WorkbenchDriftDeskResult }) {
  return (
    <div className="space-y-4 rounded-md border border-[#e5ded2] bg-white p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric
          label="Check result"
          value={result.checkReport.result === "fail" ? 1 : 0}
        />
        <Metric
          label="Routed files"
          value={result.checkReport.routed_files.length}
        />
        <Metric label="Findings" value={result.checkReport.findings.length} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <h4
            className={cx(
              fonts.mono,
              "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
            )}
          >
            Routed files
          </h4>
          <div className="mt-3 space-y-2">
            {result.checkReport.routed_files.map((file) => (
              <div
                className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-3 text-sm"
                key={file.path}
              >
                <div className="break-all font-mono text-xs text-[#5e584f]">
                  {file.path}
                </div>
                <p className="mt-1 text-xs text-[#746f66]">
                  scopes {file.scopes.join(", ") || "none"} / checks{" "}
                  {file.checks.join(", ") || "none"}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4
            className={cx(
              fonts.mono,
              "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
            )}
          >
            Active findings
          </h4>
          <div className="mt-3 space-y-2">
            {result.checkReport.findings.length > 0 ? (
              result.checkReport.findings.map((finding) => (
                <div
                  className="rounded-md border border-[#e5ded2] bg-[#fff7f4] p-3 text-sm"
                  key={`${finding.check_id}-${finding.path}-${finding.line}`}
                >
                  <div className="font-medium text-[#24231f]">
                    {finding.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#746f66]">
                    {finding.path}:{finding.line} — {finding.message}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-3 text-sm text-[#746f66]">
                No active deterministic check failures.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PromptLabInputs({
  detail,
  promptSampleId,
  promptText,
  selectedPromptSample,
  interpretation,
  onPromptSampleChange,
  onPromptTextChange,
}: {
  detail: WorkbenchScenarioDetail | null;
  promptSampleId: string;
  promptText: string;
  selectedPromptSample: WorkbenchPromptSample | null;
  interpretation: WorkbenchPromptInterpretation | null;
  onPromptSampleChange: (value: string) => void;
  onPromptTextChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-[#e5ded2] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="min-w-[220px] flex-1">
          <span
            className={cx(
              fonts.mono,
              "mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
            )}
          >
            Sample prompt
          </span>
          <select
            className="h-10 w-full rounded-md border border-[#ded6c9] bg-[#fbfaf7] px-3 text-sm text-[#24231f] outline-none focus:border-[#d88f7b]"
            onChange={(event) => onPromptSampleChange(event.target.value)}
            value={promptSampleId}
          >
            <option value="">Custom prompt</option>
            {detail?.promptSamples.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.title}
              </option>
            ))}
          </select>
        </label>
        {interpretation ? (
          <Badge
            className="mt-6 rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
            variant="secondary"
          >
            {interpretation.status}
          </Badge>
        ) : null}
      </div>
      <label className="block">
        <span
          className={cx(
            fonts.mono,
            "mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
          )}
        >
          Prompt text
        </span>
        <textarea
          className="h-28 w-full resize-none rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-4 text-sm leading-relaxed text-[#24231f] outline-none transition-colors placeholder:text-[#9b9489] focus:border-[#d88f7b]"
          onChange={(event) => onPromptTextChange(event.target.value)}
          placeholder="Try a sample prompt or write a scenario-local prompt"
          value={promptText}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <PromptNote
          label="Sample lesson"
          value={
            selectedPromptSample?.lesson ??
            "Custom prompts are matched against sample terms."
          }
        />
        <PromptNote
          label="Interpretation"
          value={
            interpretation?.intent ?? "Run Prompt Lab to interpret this prompt."
          }
        />
      </div>
    </div>
  );
}

function PromptNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-3">
      <div
        className={cx(
          fonts.mono,
          "text-[10px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
        )}
      >
        {label}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-[#5e584f]">{value}</p>
    </div>
  );
}

function ContextCard({ context }: { context: WorkbenchContextSection }) {
  const entrypoint = context.entrypoint;
  return (
    <article className="rounded-md border border-[#e5ded2] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className={cx(fonts.sans, "text-lg font-semibold text-[#24231f]")}
          >
            {context.title}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge
              className="rounded-md border-[#e5ded2] bg-[#fbfaf7] font-mono text-[10px] uppercase text-[#746f66]"
              variant="outline"
            >
              {entrypoint.match.status === "path-match"
                ? "path matched"
                : "global fallback"}
            </Badge>
            {context.packageDir ? (
              <Badge
                className="rounded-md bg-[#f4eee6] font-mono text-[10px] text-[#5e584f]"
                variant="secondary"
              >
                {context.packageDir}
              </Badge>
            ) : null}
          </div>
        </div>
        <div
          className={cx(
            fonts.mono,
            "text-right text-[11px] font-medium uppercase tracking-[0.08em] text-[#746f66]",
          )}
        >
          {context.changedFiles.length} changed path
          {context.changedFiles.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric
          label="Matched scopes"
          value={entrypoint.match.matchedScopes.length}
        />
        <Metric
          label="Selected refs"
          value={
            entrypoint.selected.prose.length +
            entrypoint.selected.composition.length +
            entrypoint.selected.exemplars.length +
            entrypoint.selected.checks.length
          }
        />
        <Metric
          label="Suggested reads"
          value={entrypoint.suggestedReads.length}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="space-y-4">
          <SectionList
            nodes={entrypoint.selected.prose}
            title="Prose anchors"
          />
          <SectionList
            nodes={entrypoint.selected.composition}
            title="Composition"
          />
        </div>
        <div className="space-y-4">
          <SectionList
            nodes={entrypoint.selected.exemplars}
            title="Exemplars"
          />
          <SectionList nodes={entrypoint.selected.checks} title="Checks" />
        </div>
      </div>
    </article>
  );
}

function RightRail({
  aiLoopResult,
  context,
  driftResult,
  fingerprintResult,
  mode,
  promptResult,
  result,
}: {
  aiLoopResult: WorkbenchAILoopResult | null;
  context: WorkbenchContextSection | null;
  driftResult: WorkbenchDriftDeskResult | null;
  fingerprintResult: WorkbenchFingerprintStudioResult | null;
  mode: WorkbenchMode;
  promptResult: WorkbenchPromptLabResult | null;
  result: WorkbenchInspectionResult | null;
}) {
  if (mode === "fingerprint") {
    return <FingerprintRightRail result={fingerprintResult} />;
  }
  if (mode === "drift") {
    return <DriftRightRail context={context} result={driftResult} />;
  }
  const handoff =
    mode === "prompt" ? promptResult?.handoffMarkdown : context?.markdown;
  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden bg-[#f7f4ee]">
      <Tabs className="min-h-0 flex-1 gap-0" defaultValue="handoff">
        <div className="border-b border-[#e5ded2] p-4">
          <TabsList
            className={cx(
              "grid w-full rounded-md border border-[#ded6c9] bg-white p-1",
              mode === "prompt" ? "grid-cols-5" : "grid-cols-4",
            )}
          >
            <TabsTrigger value="handoff">Handoff</TabsTrigger>
            <TabsTrigger value="narrowing">Narrowing</TabsTrigger>
            <TabsTrigger value="omissions">Omissions</TabsTrigger>
            <TabsTrigger value="runner">Runner</TabsTrigger>
            {mode === "prompt" ? (
              <TabsTrigger value="loop">Loop</TabsTrigger>
            ) : null}
          </TabsList>
        </div>
        <TabsContent className="min-h-0 overflow-y-auto p-4" value="handoff">
          {handoff ? <CodePreview code={handoff} /> : <EmptyRail />}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-5" value="narrowing">
          {mode === "prompt" && promptResult ? (
            <PromptNarrowingPanel result={promptResult} />
          ) : result ? (
            <LessonPanel result={result} />
          ) : (
            <EmptyRail />
          )}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-5" value="omissions">
          {context ? (
            <OmissionsPanel entrypoint={context.entrypoint} result={result} />
          ) : (
            <EmptyRail />
          )}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-5" value="runner">
          {promptResult ? (
            <RunnerPanel runner={promptResult.runner} />
          ) : (
            <EmptyRail />
          )}
        </TabsContent>
        {mode === "prompt" ? (
          <TabsContent className="min-h-0 overflow-y-auto p-5" value="loop">
            {aiLoopResult ? (
              <AILoopPanel result={aiLoopResult} />
            ) : (
              <EmptyRail />
            )}
          </TabsContent>
        ) : null}
      </Tabs>
    </aside>
  );
}

function FingerprintRightRail({
  result,
}: {
  result: WorkbenchFingerprintStudioResult | null;
}) {
  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden bg-[#f7f4ee]">
      <Tabs className="min-h-0 flex-1 gap-0" defaultValue="layers">
        <div className="border-b border-[#e5ded2] p-4">
          <TabsList className="grid w-full grid-cols-4 rounded-md border border-[#ded6c9] bg-white p-1">
            <TabsTrigger value="layers">Layers</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="stack">Stack</TabsTrigger>
            <TabsTrigger value="caveats">Caveats</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent className="min-h-0 overflow-y-auto p-4" value="layers">
          {result ? <RawLayersPanel result={result} /> : <EmptyRail />}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-5" value="summary">
          {result ? <FingerprintSummaryPanel result={result} /> : <EmptyRail />}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-5" value="stack">
          {result ? (
            <StackPreviewPanel stacks={result.stackPreviews} />
          ) : (
            <EmptyRail />
          )}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-5" value="caveats">
          {result ? <FingerprintCaveatsPanel result={result} /> : <EmptyRail />}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function RawLayersPanel({
  result,
}: {
  result: WorkbenchFingerprintStudioResult;
}) {
  return (
    <div className="space-y-4">
      {result.packages.map((pkg) => (
        <div className="space-y-3" key={pkg.packageDir}>
          <PanelTitle
            icon={<FileText className="size-4" />}
            title={pkg.packageDir}
          />
          {pkg.layers.map((layer) => (
            <div
              className="rounded-md border border-[#e5ded2] bg-white"
              key={`${pkg.packageDir}:${layer.id}`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#e5ded2] px-4 py-3">
                <div>
                  <div className="font-mono text-xs font-medium text-[#24231f]">
                    {layer.path}
                  </div>
                  <div className="mt-1 text-xs text-[#746f66]">
                    {layer.note}
                  </div>
                </div>
                <Badge
                  className="rounded-md font-mono text-[10px] uppercase"
                  variant={layer.state === "present" ? "secondary" : "outline"}
                >
                  {layer.state}
                </Badge>
              </div>
              {layer.raw ? (
                <pre className="max-h-72 overflow-auto p-4 font-mono text-xs leading-relaxed text-[#24231f]">
                  <code>{layer.raw}</code>
                </pre>
              ) : (
                <p className="p-4 text-sm text-[#746f66]">
                  Missing or intentionally omitted for this canned package.
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FingerprintSummaryPanel({
  result,
}: {
  result: WorkbenchFingerprintStudioResult;
}) {
  return (
    <div className="space-y-4">
      <PanelTitle
        icon={<BookOpen className="size-4" />}
        title="Parsed package"
      />
      {result.packages.map((pkg) => (
        <div
          className="rounded-md border border-[#e5ded2] bg-white p-5"
          key={pkg.packageDir}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="break-all text-sm font-semibold text-[#24231f]">
              {pkg.packageDir}
            </h4>
            <Badge
              className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
              variant="secondary"
            >
              {pkg.manifest.schema}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3">
            <PromptNote label="Manifest id" value={pkg.manifest.id} />
            <PromptNote label="Product" value={pkg.product ?? "Unnamed"} />
            <PromptNote label="Root" value={pkg.root} />
            <PromptNote
              label="Layer refs"
              value={`${pkg.counts.prose} prose / ${pkg.counts.exemplars} exemplars / ${pkg.counts.composition} composition`}
            />
            <PromptNote
              label="Checks"
              value={`${pkg.counts.activeChecks} active / ${pkg.counts.advisoryChecks} advisory`}
            />
          </div>
          {pkg.health.issues.length > 0 ? (
            <div className="mt-4 space-y-2">
              {pkg.health.issues.map((issue) => (
                <div
                  className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-3"
                  key={`${pkg.packageDir}:${issue.source}:${issue.rule}:${issue.path ?? ""}:${issue.message}`}
                >
                  <div className="font-mono text-[10px] uppercase text-[#746f66]">
                    {issue.source} / {issue.severity} / {issue.rule}
                  </div>
                  <p className="mt-1 text-sm text-[#5e584f]">{issue.message}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StackPreviewPanel({
  stacks,
}: {
  stacks: WorkbenchFingerprintStackPreview[];
}) {
  return (
    <div className="space-y-4">
      <PanelTitle
        icon={<GitCompare className="size-4" />}
        title="Stack provenance"
      />
      {stacks.map((stack) => (
        <div
          className="rounded-md border border-[#e5ded2] bg-white p-5"
          key={stack.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-[#24231f]">
              {stack.title}
            </h4>
            <Badge
              className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
              variant="secondary"
            >
              {stack.mergePolicy}
            </Badge>
          </div>
          <div className="mt-4 space-y-4">
            <CompactValueList title="Target paths" values={stack.targetPaths} />
            <CompactValueList
              title="Broad-to-local packages"
              values={stack.packageDirs}
            />
            <CompactValueList
              title="Merged prose refs"
              values={stack.mergedRefs.prose}
            />
            <CompactValueList
              title="Merged composition refs"
              values={stack.mergedRefs.composition}
            />
            <CompactValueList
              title="Merged check refs"
              values={stack.mergedRefs.checks}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactValueList({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  return (
    <div>
      <div
        className={cx(
          fonts.mono,
          "text-[10px] font-medium uppercase tracking-[0.1em] text-[#746f66]",
        )}
      >
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length > 0 ? (
          values.map((value) => (
            <Badge
              className="max-w-full break-all rounded-md border-[#e5ded2] bg-[#fbfaf7] font-mono text-[10px] text-[#5e584f]"
              key={value}
              variant="outline"
            >
              {value}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-[#746f66]">None.</p>
        )}
      </div>
    </div>
  );
}

function FingerprintCaveatsPanel({
  result,
}: {
  result: WorkbenchFingerprintStudioResult;
}) {
  return (
    <div className="space-y-4">
      <PanelTitle icon={<ClipboardList className="size-4" />} title="Caveats" />
      <div className="rounded-md border border-[#e5ded2] bg-white p-5">
        <p className="text-sm leading-relaxed text-[#5e584f]">
          {result.lesson}
        </p>
      </div>
      {result.packages.map((pkg) => (
        <div
          className="rounded-md border border-[#e5ded2] bg-white p-5"
          key={pkg.packageDir}
        >
          <h4 className="break-all text-sm font-semibold text-[#24231f]">
            {pkg.packageDir}
          </h4>
          <div className="mt-4 grid gap-3">
            <PromptNote
              label="Generated cache"
              value={packageCacheSummary(pkg)}
            />
            <PromptNote
              label="Intent memory"
              value={
                pkg.layers.find((layer) => layer.id === "intent")?.state ===
                "present"
                  ? "Present as optional human context."
                  : "Absent; this is acceptable for canned v1 fixtures."
              }
            />
            <PromptNote
              label="Decision memory"
              value={
                pkg.decisions.count > 0
                  ? pkg.decisions.paths.join(", ")
                  : "No decision documents in this canned package."
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DriftRightRail({
  context,
  result,
}: {
  context: WorkbenchContextSection | null;
  result: WorkbenchDriftDeskResult | null;
}) {
  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden bg-[#f7f4ee]">
      <Tabs className="min-h-0 flex-1 gap-0" defaultValue="packet">
        <div className="border-b border-[#e5ded2] p-4">
          <TabsList className="grid w-full grid-cols-4 rounded-md border border-[#ded6c9] bg-white p-1">
            <TabsTrigger value="packet">Packet</TabsTrigger>
            <TabsTrigger value="ai">AI Review</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="stance">Stance</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent className="min-h-0 overflow-y-auto p-4" value="packet">
          {result ? (
            <CodePreview code={result.reviewPacketMarkdown} />
          ) : (
            <EmptyRail />
          )}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-5" value="ai">
          {result ? <AIReviewPanel review={result.aiReview} /> : <EmptyRail />}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-4" value="context">
          {context ? <CodePreview code={context.markdown} /> : <EmptyRail />}
        </TabsContent>
        <TabsContent className="min-h-0 overflow-y-auto p-5" value="stance">
          {result ? <StancePanel result={result} /> : <EmptyRail />}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function AIReviewPanel({ review }: { review: WorkbenchAIReviewState }) {
  return (
    <div className="space-y-4">
      <PanelTitle
        icon={<ClipboardList className="size-4" />}
        title="AI advisory review"
      />
      <div className="rounded-md border border-[#e5ded2] bg-white p-5">
        <div className="flex flex-wrap gap-2">
          <Badge
            className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
            variant="secondary"
          >
            {review.state}
          </Badge>
          <Badge
            className="rounded-md border-[#e5ded2] bg-transparent font-mono text-[10px] uppercase text-[#746f66]"
            variant="outline"
          >
            {review.provider}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#5e584f]">
          {review.message}
        </p>
      </div>
      <div className="space-y-2">
        {review.findings.length > 0 ? (
          review.findings.map((finding) => (
            <div
              className="rounded-md border border-[#e5ded2] bg-white p-4"
              key={`${finding.category}-${finding.severity}-${finding.title}-${finding.path ?? ""}-${finding.line ?? ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="rounded-md border-[#e5ded2] bg-[#fbfaf7] font-mono text-[10px] uppercase text-[#746f66]"
                  variant="outline"
                >
                  {finding.category}
                </Badge>
                <Badge
                  className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
                  variant="secondary"
                >
                  {finding.severity}
                </Badge>
              </div>
              <h4 className="mt-3 text-sm font-medium text-[#24231f]">
                {finding.title}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-[#5e584f]">
                {finding.message}
              </p>
              {finding.repair ? (
                <p className="mt-2 text-xs leading-relaxed text-[#746f66]">
                  Repair: {finding.repair}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-md border border-[#e5ded2] bg-white p-4 text-sm text-[#746f66]">
            No advisory findings returned.
          </p>
        )}
      </div>
    </div>
  );
}

function StancePanel({ result }: { result: WorkbenchDriftDeskResult }) {
  return (
    <div className="space-y-4">
      <PanelTitle icon={<GitCompare className="size-4" />} title="Stance" />
      <div className="rounded-md border border-[#e5ded2] bg-white p-5">
        <div className="flex flex-wrap gap-2">
          <Badge
            className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
            variant="secondary"
          >
            {result.stance.state}
          </Badge>
          <Badge
            className="rounded-md border-[#e5ded2] bg-transparent font-mono text-[10px] uppercase text-[#746f66]"
            variant="outline"
          >
            {result.stance.recommendation}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#5e584f]">
          {result.stance.summary}
        </p>
      </div>
      <div className="grid gap-3">
        <PromptNote
          label="Blocking signals"
          value={String(result.stance.blockingSignals)}
        />
        <PromptNote
          label="Advisory signals"
          value={String(result.stance.advisorySignals)}
        />
        <PromptNote
          label="Disabled actions"
          value={result.stance.disabledActions.join(", ")}
        />
        <PromptNote label="Writes" value="none" />
      </div>
    </div>
  );
}

function PromptNarrowingPanel({
  result,
}: {
  result: WorkbenchPromptLabResult;
}) {
  const interpretation = result.interpretation;
  return (
    <div className="space-y-4">
      <PanelTitle
        icon={<GitCompare className="size-4" />}
        title="Prompt narrowing"
      />
      <div className="rounded-md border border-[#e5ded2] bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
            variant="secondary"
          >
            {interpretation.status}
          </Badge>
          <Badge
            className="rounded-md border-[#e5ded2] bg-transparent font-mono text-[10px] uppercase text-[#746f66]"
            variant="outline"
          >
            {interpretation.source}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#5e584f]">
          {interpretation.intent}
        </p>
      </div>
      <RailList title="Matched terms" values={interpretation.matchedTerms} />
      <RailList title="Target paths" values={interpretation.targetPaths} />
      <RailList
        title="Expected focus refs"
        values={interpretation.expectedFocusRefs}
      />
      <div className="rounded-md border border-[#e5ded2] bg-white p-5">
        <h4
          className={cx(
            fonts.mono,
            "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
          )}
        >
          Why
        </h4>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#5e584f]">
          {interpretation.rationale.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RunnerPanel({ runner }: { runner: WorkbenchPromptRunnerState }) {
  return (
    <div className="space-y-4">
      <PanelTitle icon={<Sparkles className="size-4" />} title="AI runner" />
      <div className="rounded-md border border-[#e5ded2] bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <PromptNote label="Mode" value={runner.mode} />
          <PromptNote label="State" value={runner.state} />
          <PromptNote label="Provider" value={runner.provider ?? "none"} />
          <PromptNote label="Model" value={runner.model ?? "none"} />
          <PromptNote
            label="Latency"
            value={
              runner.latencyMs === undefined
                ? "not run"
                : `${runner.latencyMs} ms`
            }
          />
          <PromptNote
            label="Usage"
            value={
              runner.usage
                ? `${runner.usage.totalTokens ?? "?"} tokens`
                : "not reported"
            }
          />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#5e584f]">
          {runner.message}
        </p>
      </div>
      {runner.generatedOutput ? (
        <div>
          <PanelTitle
            icon={<FileText className="size-4" />}
            title="Generated output"
          />
          <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-[#e5ded2] bg-white p-5 font-mono text-xs leading-relaxed text-[#24231f]">
            <code>{runner.generatedOutput}</code>
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function AILoopPanel({ result }: { result: WorkbenchAILoopResult }) {
  return (
    <div className="space-y-5">
      <PanelTitle icon={<GitCompare className="size-4" />} title="Loop" />
      <div className="space-y-2">
        {result.timeline.map((item) => (
          <div
            className="rounded-md border border-[#e5ded2] bg-white p-4"
            key={`${item.label}:${item.state}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-[#24231f]">
                {item.label}
              </span>
              <Badge
                className="rounded-md font-mono text-[10px] uppercase"
                variant={item.state === "error" ? "destructive" : "secondary"}
              >
                {item.state}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#746f66]">
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      {result.generation.generatedOutput ? (
        <div>
          <PanelTitle
            icon={<Sparkles className="size-4" />}
            title="Generated output"
          />
          <pre className="mt-3 max-h-80 overflow-auto rounded-md border border-[#e5ded2] bg-white p-5 font-mono text-xs leading-relaxed text-[#24231f]">
            <code>{result.generation.generatedOutput}</code>
          </pre>
        </div>
      ) : null}

      <div>
        <PanelTitle
          icon={<FileText className="size-4" />}
          title="Virtual patch"
        />
        {result.virtualPatch ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-md border border-[#e5ded2] bg-white p-4">
              <div className="flex flex-wrap gap-2">
                <Badge
                  className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
                  variant="secondary"
                >
                  {result.virtualPatch.source}
                </Badge>
                <Badge
                  className="rounded-md border-[#e5ded2] bg-transparent font-mono text-[10px] uppercase text-[#746f66]"
                  variant="outline"
                >
                  {result.virtualPatch.files.length} virtual file
                  {result.virtualPatch.files.length === 1 ? "" : "s"}
                </Badge>
              </div>
              {result.virtualPatch.notes.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs leading-relaxed text-[#746f66]">
                  {result.virtualPatch.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <CodePreview code={result.virtualPatch.diffText} />
          </div>
        ) : (
          <p className="mt-3 rounded-md border border-[#e5ded2] bg-white p-4 text-sm text-[#746f66]">
            No virtual patch was produced.
          </p>
        )}
      </div>

      {result.checkReport ? (
        <div>
          <PanelTitle
            icon={<ClipboardList className="size-4" />}
            title="Deterministic review"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <PromptNote label="Result" value={result.checkReport.result} />
            <PromptNote
              label="Routed files"
              value={String(result.checkReport.routed_files.length)}
            />
            <PromptNote
              label="Findings"
              value={String(result.checkReport.findings.length)}
            />
          </div>
        </div>
      ) : null}

      {result.aiReview ? <AIReviewPanel review={result.aiReview} /> : null}

      {result.stance ? (
        <div>
          <PanelTitle icon={<GitCompare className="size-4" />} title="Stance" />
          <div className="mt-3 grid gap-3">
            <PromptNote label="State" value={result.stance.state} />
            <PromptNote
              label="Recommendation"
              value={result.stance.recommendation}
            />
            <PromptNote label="Summary" value={result.stance.summary} />
            <PromptNote label="Writes" value="none" />
          </div>
        </div>
      ) : null}

      <div>
        <PanelTitle
          icon={<Braces className="size-4" />}
          title="Provider trace"
        />
        <div className="mt-3 space-y-2">
          {result.providerTrace.map((trace) => (
            <div
              className="rounded-md border border-[#e5ded2] bg-white p-4"
              key={`${trace.label}:${trace.provider}:${trace.state}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
                  variant="secondary"
                >
                  {trace.state}
                </Badge>
                <Badge
                  className="rounded-md border-[#e5ded2] bg-transparent font-mono text-[10px] uppercase text-[#746f66]"
                  variant="outline"
                >
                  {trace.provider}
                </Badge>
              </div>
              <div className="mt-3 text-sm font-medium text-[#24231f]">
                {trace.label}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#746f66]">
                {trace.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RailList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-md border border-[#e5ded2] bg-white p-5">
      <h4
        className={cx(
          fonts.mono,
          "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
        )}
      >
        {title}
      </h4>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {values.length > 0 ? (
          values.map((value) => (
            <Badge
              className="max-w-full break-all rounded-md border-[#e5ded2] bg-[#fbfaf7] font-mono text-[10px] text-[#5e584f]"
              key={value}
              variant="outline"
            >
              {value}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-[#746f66]">None.</p>
        )}
      </div>
    </div>
  );
}

function OmissionsPanel({
  entrypoint,
  result,
}: {
  entrypoint: WorkbenchEntrypoint;
  result: WorkbenchInspectionResult | null;
}) {
  return (
    <div className="space-y-4">
      <PanelTitle
        icon={<ChevronsUpDown className="size-4" />}
        title="Omissions"
      />
      <div className="space-y-2">
        {entrypoint.omissions.map((omission) => (
          <div
            className="rounded-md border border-[#e5ded2] bg-white p-4"
            key={omission.label}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{omission.label}</span>
              <Badge
                className="rounded-md font-mono text-[10px] uppercase"
                variant={omission.omitted > 0 ? "outline" : "secondary"}
              >
                {omission.omitted} omitted
              </Badge>
            </div>
            <p className="mt-1.5 font-mono text-xs text-[#746f66]">
              {omission.source}
            </p>
          </div>
        ))}
      </div>
      <PanelTitle
        icon={<ClipboardList className="size-4" />}
        title="Check report"
      />
      {result?.checkReport ? (
        <div className="space-y-2 rounded-md border border-[#e5ded2] bg-white p-4 text-sm">
          <div className="flex items-center justify-between">
            <span>Result</span>
            <Badge
              className="rounded-md font-mono text-[10px] uppercase"
              variant={
                result.checkReport.result === "pass"
                  ? "secondary"
                  : "destructive"
              }
            >
              {result.checkReport.result}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Routed files</span>
            <span className="font-mono text-xs">
              {result.checkReport.routed_files.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Findings</span>
            <span className="font-mono text-xs">
              {result.checkReport.findings.length}
            </span>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-[#e5ded2] bg-white p-4 text-sm text-[#746f66]">
          No diff-backed check report for this scenario.
        </p>
      )}
    </div>
  );
}

function LessonPanel({ result }: { result: WorkbenchInspectionResult }) {
  return (
    <div className="space-y-4">
      <PanelTitle
        icon={<GitCompare className="size-4" />}
        title="Scenario lesson"
      />
      <div className="rounded-md border border-[#e5ded2] bg-white p-5">
        <div
          className={cx(
            fonts.mono,
            "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
          )}
        >
          {result.scenario.kicker}
        </div>
        <h3
          className={cx(
            fonts.sans,
            "mt-2 text-xl font-semibold text-[#24231f]",
          )}
        >
          {result.scenario.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[#746f66]">
          {result.scenario.lesson}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {result.scenario.tags.map((tag) => (
            <Badge
              className="rounded-md border-[#e5ded2] bg-transparent font-mono text-[10px] uppercase text-[#746f66]"
              key={tag}
              variant="outline"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-[#e5ded2] bg-white p-5">
        <h4
          className={cx(
            fonts.mono,
            "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
          )}
        >
          Cache state
        </h4>
        <p className="mt-2 text-sm text-[#746f66]">
          {cacheSummary(result.contexts[0]?.entrypoint)}
        </p>
      </div>
    </div>
  );
}

function TreeView({ tree }: { tree: WorkbenchTreeNode[] }) {
  return (
    <FileTree
      className="max-h-[400px] overflow-y-auto rounded-md border border-[#e5ded2] bg-white p-3"
      defaultExpanded={new Set(["apps", ".ghost", "apps/dashboard"])}
    >
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} />
      ))}
    </FileTree>
  );
}

function TreeNode({ node }: { node: WorkbenchTreeNode }) {
  if (node.kind === "directory") {
    return (
      <FileTreeFolder name={node.name} path={node.path}>
        {node.children?.map((child) => (
          <TreeNode key={child.path} node={child} />
        ))}
      </FileTreeFolder>
    );
  }
  return <FileTreeFile name={node.name} path={node.path} />;
}

function SectionList({
  title,
  nodes,
}: {
  title: string;
  nodes: WorkbenchGraphNode[];
}) {
  return (
    <div>
      <h4
        className={cx(
          fonts.mono,
          "text-[11px] font-medium uppercase tracking-[0.12em] text-[#746f66]",
        )}
      >
        {title}
      </h4>
      <div className="mt-3 space-y-2.5">
        {nodes.length === 0 ? (
          <p className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-4 text-sm text-[#746f66]">
            None selected.
          </p>
        ) : (
          nodes.map((node) => (
            <div
              className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-4"
              key={node.ref}
            >
              <div className="break-all font-mono text-xs text-[#746f66]">
                {node.ref}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#24231f]">
                {node.summary}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#e5ded2] bg-[#fbfaf7] p-4">
      <div
        className={cx(
          fonts.sans,
          "text-2xl font-semibold leading-none text-[#24231f] tabular-nums",
        )}
      >
        {value}
      </div>
      <div
        className={cx(
          fonts.mono,
          "mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#746f66]",
        )}
      >
        {label}
      </div>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div
      className={cx(
        fonts.mono,
        "flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#5e584f]",
      )}
    >
      <span className="text-[#b84a32]">{icon}</span>
      {title}
    </div>
  );
}

function StatusBadge({
  count,
  checkResult,
  loading,
  unit,
}: {
  count: number;
  checkResult?: "pass" | "fail";
  loading: boolean;
  unit: "context" | "package";
}) {
  if (loading) {
    return (
      <Badge
        className="gap-1.5 rounded-md border-[#e5ded2] bg-white font-mono text-[10px] uppercase text-[#746f66]"
        variant="outline"
      >
        <RefreshCw className="size-3.5 animate-spin" />
        Resolving
      </Badge>
    );
  }
  if (count === 0) {
    return (
      <Badge
        className="rounded-md border-[#e5ded2] bg-white font-mono text-[10px] uppercase text-[#746f66]"
        variant="outline"
      >
        Idle
      </Badge>
    );
  }
  return (
    <Badge
      className="gap-1.5 rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
      variant={checkResult === "fail" ? "destructive" : "secondary"}
    >
      <CheckCircle2 className="size-3.5" />
      {checkResult ? `${checkResult} / ` : ""}
      {count} {unit}
      {count === 1 ? "" : "s"}
    </Badge>
  );
}

function AIStatusBadge({
  busy,
  settings,
}: {
  busy: boolean;
  settings: WorkbenchAISettings | null;
}) {
  if (busy) {
    return (
      <Badge
        className="gap-1.5 rounded-md border-[#e5ded2] bg-white font-mono text-[10px] uppercase text-[#746f66]"
        variant="outline"
      >
        <RefreshCw className="size-3.5 animate-spin" />
        AI running
      </Badge>
    );
  }
  if (!settings) {
    return (
      <Badge
        className="rounded-md border-[#e5ded2] bg-white font-mono text-[10px] uppercase text-[#746f66]"
        variant="outline"
      >
        AI loading
      </Badge>
    );
  }
  return (
    <Badge
      className="gap-1.5 rounded-md bg-[#f4eee6] font-mono text-[10px] uppercase text-[#5e584f]"
      variant={settings.state === "configured" ? "secondary" : "outline"}
    >
      <Sparkles className="size-3.5" />
      AI {settings.state === "configured" ? "configured" : "not configured"}
    </Badge>
  );
}

function EmptyRail() {
  return (
    <div className="rounded-md border border-[#e5ded2] bg-white p-5 text-sm text-[#746f66]">
      Select a scenario to inspect its context handoff.
    </div>
  );
}

function CodePreview({ code }: { code: string }) {
  return (
    <pre className="min-h-full overflow-auto rounded-md border border-[#e5ded2] bg-white p-5 font-mono text-xs leading-relaxed text-[#24231f]">
      <code>{code}</code>
    </pre>
  );
}

function cacheSummary(entrypoint: WorkbenchEntrypoint | undefined): string {
  const cache = entrypoint?.generatedCache;
  if (!cache) return "No context has been resolved yet.";
  if (cache.state === "missing") return "Generated cache is missing.";
  if (cache.state === "unreadable") {
    return `Generated cache is present but unreadable: ${cache.error}`;
  }
  return `Generated cache is present with ${cache.summary.package_manifests.length} package manifest hint(s).`;
}

function packageCacheSummary(pkg: WorkbenchFingerprintPackageSummary): string {
  const cache = pkg.inventory;
  if (cache.state === "missing") return "Generated cache is missing.";
  if (cache.state === "unreadable") {
    return `Generated cache is present but non-canonical and unreadable: ${cache.error}`;
  }
  return `Generated cache is present with ${cache.summary.package_manifests.length} package manifest hint(s); it remains optional source material.`;
}

function settingsDraftFrom(
  settings: WorkbenchAISettings,
): WorkbenchAISettingsUpdate {
  return {
    provider: settings.provider,
    model: settings.model,
    baseUrl: settings.baseUrl,
    timeoutMs: settings.timeoutMs,
  };
}

function parsePathLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
