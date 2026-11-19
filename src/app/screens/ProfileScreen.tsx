import { type ReactNode, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Answer, Claim, Confidence, Contradiction, LayerId } from "@/types/model";
import { LAYER_BY_ID, LAYERS } from "@/engine/layers";
import { editClaim, makeUserClaim } from "@/engine/confidence";
import { useProfile } from "@/app/data/hooks";
import { ConfidenceTag } from "@/app/components/ConfidenceTag";
import { DOTS } from "./shared";

const CONFIDENCES: Confidence[] = ["stated", "inferred", "tested"];

export function ProfileScreen() {
  const { store, claims, answers, contradictions, loading, reload } =
    useProfile();
  const [params, setParams] = useSearchParams();
  const selected: LayerId =
    (LAYERS.find((l) => l.id === params.get("layer"))?.id as LayerId) ??
    "stories";
  const [filter, setFilter] = useState<Set<Confidence>>(
    () => new Set(CONFIDENCES),
  );
  const [adding, setAdding] = useState(false);

  function selectLayer(id: LayerId) {
    setParams({ layer: id });
    setAdding(false);
  }

  const def = LAYERS.find((l) => l.id === selected);

  const answersById = useMemo(() => {
    const m = new Map<string, Answer>();
    for (const a of answers) m.set(a.id, a);
    return m;
  }, [answers]);

  const layerClaims = claims
    .filter((c) => c.layer === selected && filter.has(c.confidence))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  async function onEdit(claim: Claim, text: string) {
    await store.claims.put(editClaim(claim, text));
    await reload();
  }
  async function onDelete(claim: Claim) {
    await store.claims.delete(claim.id);
    for (const k of contradictions) {
      if (k.claimIds.includes(claim.id)) await store.contradictions.delete(k.id);
    }
    await reload();
  }
  async function onResolve(k: Contradiction, resolved: boolean) {
    await store.contradictions.put({ ...k, resolved });
    await reload();
  }
  async function onAdd(text: string) {
    await store.claims.put(
      makeUserClaim({ layer: selected, text, evidenceAnswerIds: [] }),
    );
    setAdding(false);
    await reload();
  }

  function toggleFilter(c: Confidence) {
    setFilter((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next.size === 0 ? new Set(CONFIDENCES) : next;
    });
  }

  const isContradictions = selected === "contradictions";

  return (
    <main
      className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      <div className="w-full flex flex-wrap gap-x-12 gap-y-8">
        {/* Left: layer nav */}
        <nav className="flex-[0_0_220px] flex flex-col gap-1 self-start">
          <span className="label-mono mb-2">Layers</span>
          {LAYERS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => selectLayer(l.id)}
              className={`flex items-baseline gap-2.5 text-left px-3 py-2 rounded-card ${
                l.id === selected
                  ? "bg-sand-100 text-ink font-medium"
                  : "text-muted hover:text-ink"
              }`}
            >
              <span className="font-mono text-xs">{l.num}</span>
              <span className="text-sm">{l.name}</span>
            </button>
          ))}
        </nav>

        {/* Right: the selected layer */}
        <div className="flex-1 min-w-[320px] flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="label-mono">Layer {def?.num}</span>
              <h1 className="m-0 font-heading text-[clamp(32px,4vw,46px)] tracking-[-0.02em] leading-[1.02]">
                {def?.name}
              </h1>
              <p className="m-0 mt-1 text-[15px] text-muted max-w-[52ch] leading-[1.5]">
                {isContradictions
                  ? "Where a new claim conflicts with one you already have. Explain the difference, don't erase it."
                  : "Every claim shows where it came from and how sure the model is. Edit or delete any line."}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {selected === "facts" && (
                <Link
                  to="/app/facts"
                  className="inline-flex items-center min-h-[40px] px-4 rounded-pill border border-sand-300 bg-ground text-ink no-underline text-sm font-medium hover:bg-sand-100"
                >
                  Edit the facts form
                </Link>
              )}
              {!isContradictions && (
                <div className="flex gap-2">
                  {CONFIDENCES.map((c) => (
                    <FilterPill
                      key={c}
                      confidence={c}
                      active={filter.has(c)}
                      onClick={() => toggleFilter(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <span className="label-mono">Loading…</span>
          ) : isContradictions ? (
            <ContradictionsView
              contradictions={contradictions}
              claims={claims}
              onResolve={onResolve}
            />
          ) : (
            <div className="flex flex-col">
              {layerClaims.length > 0
                ? layerClaims.map((c) => (
                    <ClaimRow
                      key={c.id}
                      claim={c}
                      answersById={answersById}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))
                : !adding && (
                    <EmptyLayer
                      layer={selected}
                      onStartAdd={() => setAdding(true)}
                    />
                  )}

              {adding ? (
                <AddClaim onAdd={onAdd} onCancel={() => setAdding(false)} />
              ) : (
                layerClaims.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="self-start mt-6 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-pill border border-sand-300 bg-ground text-ink text-sm font-medium hover:bg-sand-100"
                  >
                    <span className="text-lg leading-none">+</span>
                    Add a claim yourself
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function EmptyLayer({
  layer,
  onStartAdd,
}: {
  layer: LayerId;
  onStartAdd: () => void;
}) {
  const def = LAYER_BY_ID[layer];
  const isFacts = layer === "facts";
  return (
    <div className="flex flex-col gap-4 p-8 bg-sand-50 border-2 border-dashed border-sand-300 rounded-panel">
      <h3 className="m-0 font-heading text-xl font-medium">Nothing here yet</h3>
      <p className="m-0 text-muted max-w-[54ch] leading-[1.55]">
        {isFacts
          ? "Facts are a few stable things about you - name, where you've lived, what you do. Fill the short form to start this layer."
          : `${def.name} is built from your answers. A short interview turns them into claims you can confirm, edit, or delete - or write one yourself.`}
      </p>
      <div className="flex flex-wrap gap-3">
        {isFacts ? (
          <Link
            to="/app/facts"
            className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground no-underline text-sm font-medium"
          >
            Fill the facts form
          </Link>
        ) : (
          def.hasSeedQuestions && (
            <Link
              to={`/app/interview?layer=${layer}`}
              className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground no-underline text-sm font-medium"
            >
              Start the {def.name.toLowerCase()} interview
            </Link>
          )
        )}
        <button
          type="button"
          onClick={onStartAdd}
          className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-pill border border-sand-300 bg-ground text-ink text-sm font-medium hover:bg-sand-100"
        >
          <span className="text-lg leading-none">+</span>
          Add a claim yourself
        </button>
      </div>
    </div>
  );
}

function FilterPill({
  confidence,
  active,
  onClick,
}: {
  confidence: Confidence;
  active: boolean;
  onClick: () => void;
}) {
  const label = confidence.charAt(0).toUpperCase() + confidence.slice(1);
  const cls =
    confidence === "tested"
      ? "bg-accent text-ground border border-accent"
      : confidence === "stated"
        ? "border border-ink text-ink"
        : "border border-dashed border-muted text-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-pill font-mono text-[11px] uppercase tracking-[0.06em] transition-opacity ${cls} ${
        active ? "" : "opacity-30"
      }`}
    >
      {label}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 inline-flex items-center justify-center rounded-[10px] border border-sand-300 text-muted hover:text-ink hover:bg-sand-100"
    >
      {children}
    </button>
  );
}

function evidenceOf(claim: Claim, answersById: Map<string, Answer>): string {
  const texts = claim.evidenceAnswerIds
    .map((id) => answersById.get(id)?.text)
    .filter((t): t is string => !!t);
  if (texts.length) return texts.join("  ");
  if (claim.quote) return `"${claim.quote}"`;
  return claim.createdBy === "user" ? "Added by you." : "—";
}

function ClaimRow({
  claim,
  answersById,
  onEdit,
  onDelete,
}: {
  claim: Claim;
  answersById: Map<string, Answer>;
  onEdit: (c: Claim, text: string) => void;
  onDelete: (c: Claim) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(claim.text);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <article className="flex flex-wrap items-start gap-x-8 gap-y-3 py-6 border-t border-sand-200">
      <div className="flex-[2_1_260px] min-w-0 flex flex-col gap-2.5">
        <ConfidenceTag claim={claim} />
        {editing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            className="w-full border border-sand-300 rounded-[10px] px-3 py-2 bg-ground text-ink text-base"
          />
        ) : (
          <p className="m-0 font-heading font-normal text-[clamp(18px,1.6vw,21px)] leading-[1.4] [text-wrap:pretty]">
            {claim.text}
          </p>
        )}
      </div>

      <div className="flex-[2_1_220px] min-w-0 flex flex-col gap-1.5">
        <span className="label-mono">Evidence</span>
        <p className="m-0 text-sm text-muted leading-[1.5]">
          {evidenceOf(claim, answersById)}
        </p>
      </div>

      <div className="flex gap-2 ml-auto">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                onEdit(claim, text);
                setEditing(false);
              }}
              className="inline-flex items-center min-h-[36px] px-4 rounded-pill bg-ink text-ground text-sm font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setText(claim.text);
                setEditing(false);
              }}
              className="inline-flex items-center min-h-[36px] px-4 rounded-pill border border-sand-300 text-muted text-sm hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : confirmDelete ? (
          <>
            <button
              type="button"
              onClick={() => onDelete(claim)}
              className="inline-flex items-center min-h-[36px] px-4 rounded-pill border border-accent text-accent text-sm font-medium hover:bg-sand-100"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="inline-flex items-center min-h-[36px] px-4 rounded-pill text-muted text-sm hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <IconButton label="Edit" onClick={() => setEditing(true)}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </IconButton>
            <IconButton label="Delete" onClick={() => setConfirmDelete(true)}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
              </svg>
            </IconButton>
          </>
        )}
      </div>
    </article>
  );
}

function AddClaim({
  onAdd,
  onCancel,
}: {
  onAdd: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="mt-6 pt-6 border-t border-sand-200 flex flex-col gap-3 max-w-[560px]">
      <span className="label-mono">Add a claim yourself</span>
      <p className="m-0 text-sm text-muted">
        Write one short claim in your own words - a tendency, not a one-off. It
        enters as <em>stated</em>.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        className="w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base"
        placeholder="When X happens, I tend to Y."
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => text.trim() && onAdd(text.trim())}
          disabled={!text.trim()}
          className="inline-flex items-center min-h-[40px] px-5 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
        >
          Add claim
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center min-h-[40px] px-4 rounded-pill text-muted text-sm hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ContradictionsView({
  contradictions,
  claims,
  onResolve,
}: {
  contradictions: Contradiction[];
  claims: Claim[];
  onResolve: (k: Contradiction, resolved: boolean) => void;
}) {
  const textOf = (id: string) =>
    claims.find((c) => c.id === id)?.text ?? "(deleted claim)";

  if (contradictions.length === 0) {
    return (
      <p className="m-0 py-6 text-muted border-t border-sand-200">
        No contradictions yet. This layer fills itself: when a new claim
        conflicts with one you already have, it lands here - a place to explain
        the difference, not an error to fix.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {contradictions.map((k) => (
        <article
          key={k.id}
          className="flex flex-col gap-2 p-4 bg-ground border border-sand-300 rounded-card"
        >
          <div className="flex flex-col gap-1.5">
            <p className="m-0 text-[15px] leading-[1.45]">
              <span className="label-mono mr-2">A</span>
              {textOf(k.claimIds[0])}
            </p>
            <p className="m-0 text-[15px] leading-[1.45]">
              <span className="label-mono mr-2">B</span>
              {textOf(k.claimIds[1])}
            </p>
          </div>
          {k.note && <p className="m-0 text-sm text-muted italic">{k.note}</p>}
          <div className="flex items-center gap-3 pt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-pill font-mono text-[11px] uppercase tracking-[0.06em] ${
                k.resolved
                  ? "bg-accent text-ground border border-accent"
                  : "border border-dashed border-muted text-muted"
              }`}
            >
              {k.resolved ? "Explained" : "Open"}
            </span>
            <button
              type="button"
              onClick={() => onResolve(k, !k.resolved)}
              className="text-xs font-mono text-muted hover:text-ink"
            >
              {k.resolved ? "Reopen" : "Mark as explained"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
