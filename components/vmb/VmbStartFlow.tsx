"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { VmbActiveBookResume } from "@/components/vmb/VmbActiveBookResume";
import { UseAdminDemoBookButton } from "@/components/vmb/AdminDemoBookControls";
import { VmbDevStateControls } from "@/components/vmb/VmbDevStateControls";
import { VmbCard } from "@/components/vmb/VmbCard";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import {
  getProviderExportGuide,
  moreProviders,
  topProviders,
} from "@/lib/vmb/provider-guide";
import { readLatestAnalysisId, writeActiveBookSession } from "@/lib/vmb/active-analysis";
import { VMB_SAMPLE_BOOK_TEXT } from "@/lib/vmb/sample-book";
import { validateVmbStartFlowSubmit } from "@/lib/vmb/start-flow-validation";
import { VMB_BOOK_LOAD_LABEL } from "@/lib/vmb/book-load-cta";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { ActiveBookResolution } from "@/lib/vmb/active-book-resolver";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

type ParseSummary = {
  parsedRecordCount: number;
  skippedRows: number;
  warnings: string[];
  detectedColumns: string[];
};

type Props = {
  refreshMode?: boolean;
  activeBook?: ActiveBookResolution | null;
};

function vmbDevLog(label: string, detail?: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  if (detail === undefined) {
    console.info(`[vmb:start] ${label}`);
    return;
  }
  console.info(`[vmb:start] ${label}`, detail);
}

export function VmbStartFlow({ refreshMode = false, activeBook = null }: Props) {
  const router = useRouter();
  const isRefreshMode = refreshMode;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const [provider, setProvider] = useState<VmbProviderPlatform | "">("");
  const [otherProviderName, setOtherProviderName] = useState("");
  const [showMoreProviders, setShowMoreProviders] = useState(false);

  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [salonName, setSalonName] = useState("");

  const [bookText, setBookText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [usingSample, setUsingSample] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceBook, setReplaceBook] = useState(isRefreshMode || !activeBook?.hasActiveBook);
  const [clientActiveBook, setClientActiveBook] = useState<ActiveBookResolution | null>(
    activeBook?.hasActiveBook ? activeBook : null,
  );

  const resolvedActiveBook = clientActiveBook?.hasActiveBook ? clientActiveBook : null;
  const showResume = !!resolvedActiveBook && !replaceBook && !isRefreshMode;

  const identityComplete = !!provider && !!ownerName.trim() && !!email.trim();
  const hasBookData = usingSample || !!uploadFile || !!bookText.trim();
  const canSubmit = identityComplete && hasBookData;

  useEffect(() => {
    if (activeBook?.hasActiveBook) {
      setClientActiveBook(activeBook);
      if (!isRefreshMode) setReplaceBook(false);
      return;
    }

    let cancelled = false;
    async function loadActiveBookFromFallback() {
      const analysisId = readLatestAnalysisId();
      if (!analysisId) return;
      try {
        const params = new URLSearchParams({ analysis: analysisId, restore: "1" });
        const res = await fetch(`/api/vmb/active-book?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          ok: boolean;
          data?: ActiveBookResolution & {
            cookies?: { trialId?: string };
          };
        };
        if (!json.ok || !json.data?.hasActiveBook || cancelled) return;
        setClientActiveBook(json.data);
        writeActiveBookSession({
          analysisId: json.data.analysisId ?? analysisId,
          trialId: json.data.cookies?.trialId,
        });
        if (!isRefreshMode) setReplaceBook(false);
      } catch {
        // ignore
      }
    }

    void loadActiveBookFromFallback();
    return () => {
      cancelled = true;
    };
  }, [activeBook, isRefreshMode]);

  useEffect(() => {
    if (!isRefreshMode) return;
    let cancelled = false;
    async function prefillFromWorkspace() {
      try {
        const [trialRes, workspaceRes] = await Promise.all([
          fetch("/api/vmb/trial", { cache: "no-store", credentials: "include" }),
          fetch("/api/vmb/workspace", { cache: "no-store", credentials: "include" }),
        ]);
        const trialJson = (await trialRes.json()) as {
          ok: boolean;
          data?: { salonName: string; ownerName: string; email: string; providerPlatform?: VmbProviderPlatform };
        };
        const workspaceJson = (await workspaceRes.json()) as {
          ok: boolean;
          data?: {
            salonName: string;
            ownerName?: string;
            email?: string;
            providerPlatform?: VmbProviderPlatform;
          } | null;
        };
        if (cancelled) return;
        const lead = trialJson.ok ? trialJson.data : undefined;
        const ws = workspaceJson.ok ? workspaceJson.data : undefined;
        if (lead?.ownerName) setOwnerName(lead.ownerName);
        if (lead?.email) setEmail(lead.email);
        if (lead?.salonName || ws?.salonName) setSalonName(lead?.salonName ?? ws?.salonName ?? "");
        const platform = lead?.providerPlatform ?? ws?.providerPlatform;
        if (platform) setProvider(platform);
      } catch {
        // refresh still works with manual entry
      }
    }
    void prefillFromWorkspace();
    return () => {
      cancelled = true;
    };
  }, [isRefreshMode]);

  function selectProvider(id: VmbProviderPlatform) {
    vmbDevLog("provider selected", id);
    setProvider(id);
    setError(null);
    if (id !== "other") setOtherProviderName("");
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
    setUsingSample(false);
    if (file && file.name.toLowerCase().endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setBookText(reader.result);
      };
      reader.readAsText(file);
    } else if (file && (file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".c"))) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setBookText(reader.result);
      };
      reader.readAsText(file);
    }
  }

  function handleUseSampleBook() {
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setBookText(VMB_SAMPLE_BOOK_TEXT);
    setUsingSample(true);
    setError(null);
  }

  function handleHaveExport() {
    setError(null);
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleFindTheMoneyClick() {
    const validation = validateVmbStartFlowSubmit({
      provider,
      ownerName,
      email,
      hasBookData,
    });
    if (!validation.ok) {
      vmbDevLog("submit blocked", validation);
      setError(validation.message);
      return;
    }
    void handleFindTheMoney();
  }

  async function handleFindTheMoney() {
    setBusy(true);
    setError(null);

    try {
      if (!canSubmit || !provider) {
        setError("Choose your provider, enter your details, and add your client book.");
        return;
      }

      const resolvedSalonName = salonName.trim() || "Your Salon";

      let trialId: string | undefined;
      if (isRefreshMode) {
        const existingTrialRes = await fetch("/api/vmb/trial", {
          cache: "no-store",
          credentials: "include",
        });
        const existingTrialJson = (await existingTrialRes.json()) as {
          ok: boolean;
          data?: { id: string };
        };
        if (!existingTrialJson.ok || !existingTrialJson.data?.id) {
          vmbDevLog("trial refresh failed", existingTrialJson);
          setError(
            existingTrialRes.status === 401
              ? "No salon session cookie — load your book or refresh after analyzing a book."
              : "Sign in to your salon session first, or load your book from the start page.",
          );
          return;
        }
        trialId = existingTrialJson.data.id;
        vmbDevLog("trial refresh ok", trialId);
      } else {
        const trialRes = await fetch("/api/vmb/trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            salonName: resolvedSalonName,
            ownerName: ownerName.trim(),
            email: email.trim(),
            providerPlatform: provider,
          }),
        });
        const trialJson = (await trialRes.json()) as {
          ok: boolean;
          data?: { id: string };
          error?: string;
        };
        if (!trialJson.ok || !trialJson.data?.id) {
          vmbDevLog("trial create failed", { status: trialRes.status, trialJson });
          setError(trialJson.error ?? "Could not start trial.");
          return;
        }
        trialId = trialJson.data.id;
        vmbDevLog("trial create ok", trialId);
      }

      let analyzeRes: Response;
      if (uploadFile) {
        const form = new FormData();
        form.append("trialId", trialId);
        form.append("salonName", resolvedSalonName);
        form.append("providerPlatform", provider);
        form.append("file", uploadFile);
        if (bookText.trim()) form.append("inputText", bookText);
        if (isRefreshMode || replaceBook) {
          form.append("reprocess", "true");
          form.append("replaceBook", "true");
        }
        if (isRefreshMode) form.append("refreshMode", "true");
        analyzeRes = await fetch("/api/vmb/analyze-book", {
          method: "POST",
          credentials: "include",
          body: form,
        });
      } else {
        analyzeRes = await fetch("/api/vmb/analyze-book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            trialId,
            salonName: resolvedSalonName,
            providerPlatform: provider,
            inputText: bookText,
            sourceType: usingSample || bookText === VMB_SAMPLE_BOOK_TEXT ? "sample" : "paste",
            reprocess: isRefreshMode || replaceBook,
            replaceBook: isRefreshMode || replaceBook,
            refreshMode: isRefreshMode,
          }),
        });
      }

      const analyzeJson = (await analyzeRes.json()) as {
        ok: boolean;
        data?: {
          analysis: VmbBookAnalysisResult;
          parse: ParseSummary;
        };
        error?: string;
      };
      if (!analyzeJson.ok || !analyzeJson.data?.analysis) {
        vmbDevLog("analyze failed", { status: analyzeRes.status, analyzeJson });
        if (analyzeRes.status === 401) {
          setError("Trial session missing — your cookie may have expired. Start again from step one.");
        } else {
          setError(analyzeJson.error ?? "We could not read your book. Try another export.");
        }
        return;
      }

      const result = analyzeJson.data.analysis;
      vmbDevLog("analyze ok", result.analysisId);
      writeActiveBookSession({ analysisId: result.analysisId, trialId });
      const todayHref = `/vmb/today?analysis=${encodeURIComponent(result.analysisId)}`;
      console.error("[VMB-POST-PROCESS-REDIRECT]", {
        target: todayHref,
        analysisId: result.analysisId,
        href: typeof window !== "undefined" ? window.location.href : null,
      });
      router.push(todayHref);
    } catch (e) {
      vmbDevLog("submit error", e);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <VmbPageFrame
      width="standard"
      title={isRefreshMode ? "Book Refresh" : VMB_BOOK_LOAD_LABEL}
      subtitle={
        isRefreshMode
          ? "Upload a fresh client export to update this week's moves."
          : "Start with your booking provider, share where to send results, then upload your client book."
      }
    >
      {showResume ? (
        <div style={{ marginBottom: 28 }}>
          <VmbActiveBookResume activeBook={resolvedActiveBook!} onReplace={() => setReplaceBook(true)} />
        </div>
      ) : (
        <UseAdminDemoBookButton
          onBound={() => {
            window.location.href = "/vmb/dashboard";
          }}
        />
      )}

      <VmbDevStateControls />

      {!showResume ? (
      <div style={{ display: "grid", gap: 28 }}>
        {/* 1. Provider */}
        <section>
          <h2 style={sectionTitleStyle}>Who holds your client book?</h2>
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            style={{ marginBottom: 14 }}
          >
            {topProviders.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProvider(p.id)}
                style={providerCardStyle(provider === p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {!showMoreProviders ? (
            <button
              type="button"
              onClick={() => setShowMoreProviders(true)}
              style={{
                padding: "10px 0",
                border: "none",
                background: "none",
                fontSize: 14,
                fontWeight: 600,
                color: VMB_THEME.muted,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              More providers
            </button>
          ) : (
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              style={{ marginTop: 4 }}
            >
              {moreProviders.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProvider(p.id)}
                  style={moreProviderCardStyle(provider === p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {provider === "other" ? (
            <label style={{ display: "grid", gap: 6, marginTop: 16, fontSize: 13, fontWeight: 600 }}>
              What booking system do you use?
              <input
                value={otherProviderName}
                onChange={(e) => setOtherProviderName(e.target.value)}
                placeholder="e.g. Zenoti, Meevo, custom spreadsheet"
                style={fieldStyle}
              />
            </label>
          ) : null}
        </section>

        {/* 2. Identity */}
        {provider ? (
          <section>
            <h2 style={sectionTitleStyle}>Where should we send your results?</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                placeholder="Your name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                style={fieldStyle}
                autoComplete="name"
              />
              <input
                type="email"
                placeholder="Salon email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={fieldStyle}
                autoComplete="email"
              />
              <input
                placeholder="Salon name (optional)"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                style={fieldStyle}
                autoComplete="organization"
              />
            </div>
          </section>
        ) : null}

        {/* 3. Export guide */}
        {provider ? (
          <section>
            <h2 style={sectionTitleStyle}>Get your client book</h2>
            <VmbCard padding="md">
              <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: VMB_THEME.muted }}>
                {getProviderExportGuide(provider, otherProviderName)}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleHaveExport}
                  disabled={!identityComplete}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 12,
                    border: `1px solid ${VMB_THEME.line}`,
                    background: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: identityComplete ? "pointer" : "not-allowed",
                    opacity: identityComplete ? 1 : 0.55,
                  }}
                >
                  I have my export
                </button>
                <button
                  type="button"
                  onClick={handleUseSampleBook}
                  disabled={!identityComplete}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 12,
                    border: "none",
                    background: VMB_THEME.accentSoft,
                    color: VMB_THEME.accent,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: identityComplete ? "pointer" : "not-allowed",
                    opacity: identityComplete ? 1 : 0.55,
                  }}
                >
                  Use sample book
                </button>
              </div>
            </VmbCard>
          </section>
        ) : null}

        {/* 4. Upload / paste */}
        {identityComplete ? (
          <section ref={uploadSectionRef}>
            <h2 style={sectionTitleStyle}>Add your client book</h2>
            <label
              style={{
                display: "block",
                marginBottom: 12,
                padding: "18px 16px",
                borderRadius: 14,
                border: `1px dashed ${VMB_THEME.line}`,
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
                color: VMB_THEME.muted,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.c,text/csv"
                onChange={handleFileChange}
                style={{ display: "block", marginBottom: 8, fontSize: 13, width: "100%" }}
              />
              Upload CSV export
              {uploadFile ? (
                <span style={{ display: "block", marginTop: 6, fontWeight: 600, color: VMB_THEME.ink }}>
                  {uploadFile.name}
                </span>
              ) : null}
            </label>

            <textarea
              value={bookText}
              onChange={(e) => {
                setBookText(e.target.value);
                setUsingSample(e.target.value === VMB_SAMPLE_BOOK_TEXT);
                if (e.target.value.trim()) setUploadFile(null);
              }}
              placeholder="Or paste CSV rows here"
              rows={7}
              style={{
                ...fieldStyle,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.45,
              }}
            />
          </section>
        ) : null}

        {error ? (
          <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error}</p>
        ) : null}

        <button
          type="button"
          onClick={handleFindTheMoneyClick}
          disabled={busy}
          aria-disabled={busy || !canSubmit}
          style={{
            padding: "16px 22px",
            borderRadius: 14,
            border: "none",
            background: VMB_THEME.accent,
            color: "#fff",
            fontSize: 16,
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.55 : canSubmit ? 1 : 0.72,
          }}
        >
          {busy
            ? isRefreshMode
              ? "Refreshing your book…"
              : "Finding the money…"
            : isRefreshMode
              ? "Refresh My Book"
              : VMB_BOOK_LOAD_LABEL}
        </button>
      </div>
      ) : null}
    </VmbPageFrame>
  );
}

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

function providerCardStyle(selected: boolean): CSSProperties {
  return {
    textAlign: "left",
    padding: "20px 18px",
    borderRadius: 16,
    border: `1px solid ${selected ? VMB_THEME.accent : VMB_THEME.line}`,
    background: selected ? VMB_THEME.accentSoft : "#fff",
    fontSize: 17,
    fontWeight: selected ? 800 : 600,
    color: VMB_THEME.ink,
    cursor: "pointer",
    boxShadow: selected ? "0 2px 8px rgba(157, 23, 77, 0.08)" : "0 1px 3px rgba(28, 25, 23, 0.04)",
  };
}

function moreProviderCardStyle(selected: boolean): CSSProperties {
  return {
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${selected ? VMB_THEME.accent : VMB_THEME.line}`,
    background: selected ? VMB_THEME.accentSoft : "#fff",
    fontSize: 14,
    fontWeight: selected ? 700 : 500,
    color: VMB_THEME.ink,
    cursor: "pointer",
  };
}

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  fontSize: 15,
  boxSizing: "border-box",
};
