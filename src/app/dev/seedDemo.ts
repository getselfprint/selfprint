import type { Claim, LayerId, MirrorResponse, TestRun } from "@/types/model";
import { makeUserClaim } from "@/engine/confidence";
import { newId } from "@/engine/session";
import { type SelfprintStore, SETTINGS_KEYS } from "@/store";
import { markFactsStepDone, saveFacts } from "@/app/facts/factsData";

/** Fictional Facts for the up-front demo (a neighbourhood bakery owner). */
const DEMO_FACTS: Record<string, string> = {
  name: "Sam",
  born: "1986, a small coastal town",
  height: "173 cm",
  languages: "English\nFrench",
  work: "Runs a neighbourhood bakery",
  places: "Brittany\nLisbon\nPortland, Oregon",
  household: "Partner and an old rescue dog",
  routine: "Up at 5 for the ovens, a quiet hour before the shop opens, home by six.",
  tastes: "Sourdough, long walks, dry humour\nCan't stand waste or being rushed",
};

/**
 * DEV ONLY. Fills every interviewable layer with a coherent demo personality so
 * the finished shape (Profile, Map, Export, Mirror, Test) can be previewed
 * without a full interview. Not shipped to production (gated behind
 * import.meta.env.DEV at the call site). Facts are left untouched.
 */

// A fictional demo persona (a neighborhood bakery owner, former teacher) - not
// based on any real person. Only here to show the finished shape of a profile.
const LAYER_CLAIMS: Record<Exclude<LayerId, "facts">, string[]> = {
  stories: [
    "Editing the school paper as a teenager taught me I'm happiest making something people actually use.",
    "Watching my aunt keep her shop open through a brutal winter showed me steadiness is its own kind of courage.",
    "A student I'd nearly given up on thanked me a decade later - I learned my impact is rarely visible when it lands.",
    "A holiday where I missed every train taught me to build slack into any plan I care about.",
    "Taking over a failing bakery and slowly turning it around taught me I trust routines more than bursts of inspiration.",
    "Losing a friend too young made me quick to say the thing that matters before the moment passes.",
  ],
  values: [
    "When speed and care collide, I slow down and do it right, even if it costs the deadline.",
    "I'll choose a lasting relationship over a short-term win almost every time.",
    "When honesty and kindness pull apart, I tell the truth, but I take real care in how.",
    "I value steadiness over novelty; I'll usually take the dependable path.",
    "I'd rather be trusted than admired.",
    "I guard my early mornings for the work that matters, even when it disappoints someone.",
  ],
  triggers: [
    "People who overpromise and underdeliver wear me down faster than hard work ever could.",
    "Being rushed in the middle of careful work spikes my frustration.",
    "A slow morning with coffee and no screen resets me better than anything.",
    "Casual cruelty, even dressed up as a joke, gets under my skin at once.",
    "I settle myself by tidying the counter until the next task feels manageable.",
    "Plans that fall apart because someone didn't prepare are a reliable trigger.",
  ],
  voice: [
    "I argue by granting the other person's best point first, then adding mine.",
    "I apologize simply and fast, without a cushion of excuses.",
    "My humor is dry; I'd sooner undersell a joke than tell one outright.",
    "I reach for a concrete story instead of an abstraction when I want to convince someone.",
    "I like to close a tense conversation with a clear next step, not a mood.",
    "I catch myself saying 'let's keep it simple' more than I notice.",
  ],
  contradictions: [
    "I preach keeping plans loose, yet I get thrown when my own routine breaks.",
    "I say I value honesty over kindness, but I soften hard news more than I admit.",
    "I put others first, then quietly resent it when my effort goes unnoticed.",
    "I tell everyone else to rest and I'm the worst at taking my own advice.",
    "I prize steadiness, yet I've walked away from safe things on a gut feeling.",
    "I say I prefer the background, yet I work hard to be seen as dependable.",
  ],
};

/** Every other claim is promoted to `tested` for visible confidence variety. */
function claimsFor(layer: Exclude<LayerId, "facts">): Claim[] {
  return LAYER_CLAIMS[layer].map((text, i) => {
    const c = makeUserClaim({ layer, text, evidenceAnswerIds: [] });
    return i % 2 === 1 ? { ...c, confidence: "tested" } : c;
  });
}

export async function seedDemoPersonality(store: SelfprintStore): Promise<void> {
  // Clear anything we own (keep the user's real Facts), so re-running is clean.
  const existing = await store.claims.all();
  for (const c of existing) {
    if (c.layer !== "facts") await store.claims.delete(c.id);
  }
  for (const k of await store.contradictions.all())
    await store.contradictions.delete(k.id);
  for (const t of await store.tests.all()) await store.tests.delete(t.id);
  for (const m of await store.mirror.all()) await store.mirror.delete(m.id);

  // Claims across every interviewable layer.
  const byLayer = {} as Record<Exclude<LayerId, "facts">, Claim[]>;
  for (const layer of Object.keys(LAYER_CLAIMS) as Exclude<
    LayerId,
    "facts"
  >[]) {
    byLayer[layer] = claimsFor(layer);
    for (const c of byLayer[layer]) await store.claims.put(c);
  }

  // A couple of cross-layer contradictions for the Contradictions view.
  await store.contradictions.put({
    id: newId(),
    claimIds: [byLayer.values[2].id, byLayer.contradictions[1].id],
    note: "You lead with honesty in principle, but your own account says you soften hard news. Worth watching, not fixing.",
    resolved: false,
  });
  await store.contradictions.put({
    id: newId(),
    claimIds: [byLayer.values[1].id, byLayer.contradictions[2].id],
    note: "You put the team first and still feel the sting when your part goes unseen. Both are true.",
    resolved: true,
  });

  // Mirror: a self-view plus one revealed response, so the gap chart renders.
  await store.settings.set(SETTINGS_KEYS.mirrorSelf, {
    patience: 74,
    listening: 66,
    admits: 60,
    generous: 70,
    criticism: 58,
    directness: 72,
  });
  await store.mirror.put({
    id: newId(),
    respondentLabel: "a close colleague",
    scales: {
      patience: 38,
      listening: 58,
      admits: 72,
      generous: 64,
      criticism: 46,
      directness: 80,
    },
    openAnswers: [
      {
        question: "When are they at their best?",
        text: "When a task is concrete and they can work it carefully, without being rushed.",
      },
      {
        question: "What do they get wrong about themselves?",
        text: "They think they stay calm when rushed, but they go quiet and clipped.",
      },
    ],
    shared: true,
  } satisfies MirrorResponse);

  // A few passing tests so the Map shows a match score.
  const tested = [...byLayer.values, ...byLayer.voice];
  const testRuns: Omit<TestRun, "id">[] = [
    {
      scenario:
        "A supplier delivers a rushed, sloppy order right before a busy weekend. What do you do?",
      personaAnswer:
        "I'd hold the line on quality and push the timeline rather than put out something I'll regret.",
      usedClaimIds: [byLayer.values[0].id],
      rating: 5,
    },
    {
      scenario: "You disagree with a respected mentor in front of others. How do you handle it?",
      personaAnswer:
        "I'd grant their strongest point first, then make mine with a concrete example.",
      usedClaimIds: [byLayer.voice[0].id, byLayer.voice[3].id],
      rating: 5,
    },
    {
      scenario: "You're offered a steady contract or a riskier, flashier opportunity.",
      personaAnswer:
        "I take the steady one; I'd rather have something dependable than chase the shine.",
      usedClaimIds: [byLayer.values[3].id],
      rating: 4,
    },
    {
      scenario: "Someone takes credit for a quiet fix you made. Your reaction?",
      personaAnswer:
        "It stings more than I let on, but I rarely say it out loud.",
      usedClaimIds: [byLayer.contradictions[2].id],
      rating: 4,
    },
    {
      scenario: "A regular changes their big order for the third time this week.",
      personaAnswer:
        "I get irritated, then I tidy up and re-plan until it feels manageable again.",
      usedClaimIds: [byLayer.triggers[0].id, byLayer.triggers[4].id],
      rating: 5,
    },
  ];
  for (const t of testRuns) await store.tests.put({ id: newId(), ...t });
  void tested;
}

/**
 * Enter the up-front demo: a fully filled fictional persona (Facts + every
 * interviewable layer + Mirror + tests) so a new user can see a finished
 * profile before they download a model or paste a key.
 */
export async function seedDemo(store: SelfprintStore): Promise<void> {
  await saveFacts(store, DEMO_FACTS); // writes Facts + facts-layer claims
  await seedDemoPersonality(store); // interview-layer claims, Mirror, tests
  await markFactsStepDone(store);
  await store.settings.set(SETTINGS_KEYS.demoMode, true);
}

/** Leave the demo and wipe everything it created, back to a clean first run. */
export async function clearDemo(store: SelfprintStore): Promise<void> {
  for (const c of await store.claims.all()) await store.claims.delete(c.id);
  for (const a of await store.answers.all()) await store.answers.delete(a.id);
  for (const k of await store.contradictions.all())
    await store.contradictions.delete(k.id);
  for (const t of await store.tests.all()) await store.tests.delete(t.id);
  for (const m of await store.mirror.all()) await store.mirror.delete(m.id);
  for (const key of [
    SETTINGS_KEYS.facts,
    SETTINGS_KEYS.factsStepDone,
    SETTINGS_KEYS.mirrorSelf,
    SETTINGS_KEYS.interviewDraft,
    SETTINGS_KEYS.demoMode,
  ]) {
    await store.settings.delete(key);
  }
}
