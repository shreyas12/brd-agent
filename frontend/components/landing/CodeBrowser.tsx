"use client";

import React, { useEffect, useState } from "react";
import { API_BASE, getSource, type SourceFile } from "@/lib/api";
import CodeView from "@/components/CodeView";

type FileEntry = { type: "file"; path: string; label: string; note?: string };
type DirEntry = { type: "dir"; label: string; children: TreeNode[] };
type TreeNode = FileEntry | DirEntry;

// Curated, ordered. This isn't a full filesystem dump — it's the surface
// worth reading to understand the project.
const TREE: TreeNode[] = [
  {
    type: "dir",
    label: "backend",
    children: [
      { type: "file", path: "backend/main.py", label: "main.py", note: "FastAPI surface" },
      { type: "file", path: "backend/requirements.txt", label: "requirements.txt" },
      { type: "file", path: "backend/smoke_test.py", label: "smoke_test.py" },
      { type: "file", path: "backend/http_smoke.py", label: "http_smoke.py" },
      {
        type: "dir",
        label: "graph",
        children: [
          { type: "file", path: "backend/graph/state.py", label: "state.py", note: "AgentState typed contract" },
          { type: "file", path: "backend/graph/builder.py", label: "builder.py", note: "graph wiring + checkpointer" },
          { type: "file", path: "backend/graph/routing.py", label: "routing.py", note: "conditional edges" },
          { type: "file", path: "backend/graph/llm.py", label: "llm.py" },
          { type: "file", path: "backend/graph/vectorstore.py", label: "vectorstore.py" },
        ],
      },
      {
        type: "dir",
        label: "graph/nodes",
        children: [
          { type: "file", path: "backend/graph/nodes/input_handler.py", label: "input_handler.py" },
          { type: "file", path: "backend/graph/nodes/chunker.py", label: "chunker.py", note: "markdown-aware split" },
          { type: "file", path: "backend/graph/nodes/embedder.py", label: "embedder.py" },
          { type: "file", path: "backend/graph/nodes/emphasis_collector.py", label: "emphasis_collector.py" },
          { type: "file", path: "backend/graph/nodes/template_builder.py", label: "template_builder.py" },
          { type: "file", path: "backend/graph/nodes/retriever.py", label: "retriever.py" },
          { type: "file", path: "backend/graph/nodes/drafter.py", label: "drafter.py", note: "Agent 1" },
          { type: "file", path: "backend/graph/nodes/renderer.py", label: "renderer.py" },
          { type: "file", path: "backend/graph/nodes/evaluator.py", label: "evaluator.py", note: "grounding + coverage" },
          { type: "file", path: "backend/graph/nodes/feedback_collector.py", label: "feedback_collector.py" },
          { type: "file", path: "backend/graph/nodes/critic.py", label: "critic.py", note: "Agent 2" },
          { type: "file", path: "backend/graph/nodes/finalizer.py", label: "finalizer.py" },
        ],
      },
      {
        type: "dir",
        label: "prompts",
        children: [
          { type: "file", path: "backend/prompts/drafter.txt", label: "drafter.txt" },
          { type: "file", path: "backend/prompts/critic.txt", label: "critic.txt" },
          { type: "file", path: "backend/prompts/evaluator.txt", label: "evaluator.txt" },
        ],
      },
    ],
  },
  {
    type: "dir",
    label: "frontend",
    children: [
      {
        type: "dir",
        label: "app",
        children: [
          { type: "file", path: "frontend/app/page.tsx", label: "page.tsx", note: "this landing page" },
          { type: "file", path: "frontend/app/app/page.tsx", label: "app/page.tsx", note: "the working app" },
          { type: "file", path: "frontend/app/layout.tsx", label: "layout.tsx" },
          { type: "file", path: "frontend/app/globals.css", label: "globals.css" },
        ],
      },
      {
        type: "dir",
        label: "components",
        children: [
          { type: "file", path: "frontend/components/ChatPane.tsx", label: "ChatPane.tsx" },
          { type: "file", path: "frontend/components/PipelineMap.tsx", label: "PipelineMap.tsx" },
          { type: "file", path: "frontend/components/TracePanel.tsx", label: "TracePanel.tsx" },
          { type: "file", path: "frontend/components/DraftView.tsx", label: "DraftView.tsx" },
          { type: "file", path: "frontend/components/EmphasisDial.tsx", label: "EmphasisDial.tsx" },
          { type: "file", path: "frontend/components/CodeAccordion.tsx", label: "CodeAccordion.tsx" },
          { type: "file", path: "frontend/components/CodeView.tsx", label: "CodeView.tsx" },
          { type: "file", path: "frontend/components/TourGuide.tsx", label: "TourGuide.tsx" },
          { type: "file", path: "frontend/components/SessionSidebar.tsx", label: "SessionSidebar.tsx", note: "ChatGPT-style history" },
        ],
      },
      {
        type: "dir",
        label: "components/landing",
        children: [
          { type: "file", path: "frontend/components/landing/Hero.tsx", label: "Hero.tsx" },
          { type: "file", path: "frontend/components/landing/PipelineShowcase.tsx", label: "PipelineShowcase.tsx" },
          { type: "file", path: "frontend/components/landing/ArchitectureSection.tsx", label: "ArchitectureSection.tsx" },
          { type: "file", path: "frontend/components/landing/MemorySection.tsx", label: "MemorySection.tsx" },
          { type: "file", path: "frontend/components/landing/ApiSection.tsx", label: "ApiSection.tsx" },
          { type: "file", path: "frontend/components/landing/CodeBrowser.tsx", label: "CodeBrowser.tsx" },
        ],
      },
      {
        type: "dir",
        label: "lib",
        children: [
          { type: "file", path: "frontend/lib/api.ts", label: "api.ts" },
          { type: "file", path: "frontend/lib/nodeExplainers.ts", label: "nodeExplainers.ts" },
        ],
      },
    ],
  },
  {
    type: "dir",
    label: "samples",
    children: [
      {
        type: "file",
        path: "samples/customer_onboarding_discovery.md",
        label: "customer_onboarding_discovery.md",
      },
    ],
  },
];

const INITIAL_OPEN = new Set([
  "backend",
  "backend/graph",
  "backend/graph/nodes",
  "frontend",
  "frontend/components",
]);
const DEFAULT_FILE = "backend/graph/state.py";

function flattenFiles(nodes: TreeNode[]): FileEntry[] {
  const out: FileEntry[] = [];
  for (const n of nodes) {
    if (n.type === "file") out.push(n);
    else out.push(...flattenFiles(n.children));
  }
  return out;
}

export default function CodeBrowser() {
  const [open, setOpen] = useState<Set<string>>(INITIAL_OPEN);
  const [selected, setSelected] = useState<string>(DEFAULT_FILE);
  const [content, setContent] = useState<SourceFile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const allFiles = React.useMemo(() => flattenFiles(TREE), []);
  const selectedFile = allFiles.find((f) => f.path === selected);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    getSource(selected)
      .then(setContent)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [selected]);

  function toggleDir(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section id="code" className="relative px-6 md:px-10 py-14 md:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8">
          <div className="text-[0.7rem] font-bold uppercase tracking-widest text-accent mb-2">
            Code
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tightest mb-3">
            Browse every file
          </h2>
          <p className="text-[0.95rem] text-muted leading-relaxed max-w-2xl">
            Curated and ordered — backend pipeline first, then the
            agent prompts, then the frontend components. Files are served
            read-only by the FastAPI <code className="text-[0.85em] bg-slate-100 px-1.5 py-0.5 rounded font-mono">/api/source</code> endpoint.
          </p>
        </div>

        <div className="card overflow-hidden grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-[560px]">
          <aside className="border-b lg:border-b-0 lg:border-r border-line bg-bg2 overflow-auto max-h-[560px]">
            <div className="px-4 py-3 border-b border-line text-[0.7rem] font-bold uppercase tracking-widest text-muted bg-white sticky top-0 z-10">
              {allFiles.length} files
            </div>
            <ul className="p-2 text-[0.8rem]">
              {TREE.map((n, i) => (
                <TreeNodeView
                  key={i}
                  node={n}
                  pathKey=""
                  depth={0}
                  open={open}
                  toggleDir={toggleDir}
                  selected={selected}
                  setSelected={setSelected}
                />
              ))}
            </ul>
          </aside>

          <div className="flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-line bg-white flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <code className="font-mono text-[0.82rem] font-bold text-ink truncate block">
                  {selected}
                </code>
                {selectedFile?.note && (
                  <div className="text-[0.7rem] text-muted mt-0.5">
                    {selectedFile.note}
                  </div>
                )}
              </div>
              {content && (
                <div className="flex items-center gap-3 text-[0.7rem] text-muted shrink-0">
                  <span className="font-mono uppercase tracking-widest">
                    {content.language}
                  </span>
                  <span>{content.lines} lines</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(content.content)}
                    className="hover:text-accent transition font-bold"
                  >
                    Copy
                  </button>
                  <a
                    href={`${API_BASE}/api/source?path=${encodeURIComponent(selected)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-accent transition font-bold"
                  >
                    Raw ↗
                  </a>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0">
              {loading && (
                <div className="p-5 text-sm text-muted">Loading {selected}…</div>
              )}
              {error && (
                <div className="p-5 text-sm text-danger">
                  Failed to load: {error}
                </div>
              )}
              {!loading && !error && content && (
                <CodeView code={content.content} maxHeight="520px" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TreeNodeView({
  node,
  pathKey,
  depth,
  open,
  toggleDir,
  selected,
  setSelected,
}: {
  node: TreeNode;
  pathKey: string;
  depth: number;
  open: Set<string>;
  toggleDir: (k: string) => void;
  selected: string;
  setSelected: (p: string) => void;
}) {
  if (node.type === "file") {
    const isSelected = selected === node.path;
    return (
      <li>
        <button
          type="button"
          onClick={() => setSelected(node.path)}
          className={
            "w-full text-left rounded px-2 py-1 truncate font-mono text-[0.78rem] flex items-center gap-2 transition " +
            (isSelected
              ? "bg-accent/12 text-accent font-bold"
              : "hover:bg-white text-fg")
          }
          style={{ paddingLeft: `${0.5 + depth * 0.9}rem` }}
        >
          <span className="opacity-60">›</span>
          <span className="truncate">{node.label}</span>
        </button>
      </li>
    );
  }
  const key = pathKey ? `${pathKey}/${node.label}` : node.label;
  const isOpen = open.has(key);
  return (
    <>
      <li>
        <button
          type="button"
          onClick={() => toggleDir(key)}
          className="w-full text-left rounded px-2 py-1 truncate font-mono text-[0.78rem] flex items-center gap-2 font-bold text-ink hover:bg-white transition"
          style={{ paddingLeft: `${0.5 + depth * 0.9}rem` }}
        >
          <span
            className={
              "transition-transform text-muted text-[0.7rem] " +
              (isOpen ? "rotate-90" : "")
            }
          >
            ▸
          </span>
          <span className="truncate">{node.label}</span>
        </button>
      </li>
      {isOpen &&
        node.children.map((c, i) => (
          <TreeNodeView
            key={i}
            node={c}
            pathKey={key}
            depth={depth + 1}
            open={open}
            toggleDir={toggleDir}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
    </>
  );
}
