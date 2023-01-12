import { ActorPF2e } from "@actor";
import { DamageDicePF2e, DeferredValueParams, ModifierAdjustment, ModifierPF2e } from "@actor/modifiers";
import { ItemSourcePF2e } from "@item/data";
import { RollNotePF2e } from "@module/notes";
import { DegreeOfSuccessAdjustment } from "@system/degree-of-success";
import { RollTwiceOption } from "@system/rolls";
import { isObject, pick } from "@util";
import { RuleElementPF2e } from "./rule-element";
import { BracketedValue } from "./rule-element/data";
import { DamageDiceSynthetics, RollSubstitution, RollTwiceSynthetic, RuleElementSynthetics } from "./synthetics";

/** Extracts a list of all cloned modifiers across all given keys in a single list. */
function extractModifiers(
    synthetics: Pick<RuleElementSynthetics, "modifierAdjustments" | "statisticsModifiers">,
    selectors: string[],
    options: DeferredValueParams = {}
): ModifierPF2e[] {
    const { modifierAdjustments, statisticsModifiers } = synthetics;
    const modifiers = Array.from(new Set(selectors))
        .flatMap((s) => statisticsModifiers[s] ?? [])
        .flatMap((d) => d(options) ?? []);
    for (const modifier of modifiers) {
        modifier.adjustments = extractModifierAdjustments(modifierAdjustments, selectors, modifier.slug);
    }

    return modifiers;
}

/** */
function extractDamageModifiers(...args: Parameters<typeof extractModifiers>): {
    persistent: ModifierPF2e[];
    main: ModifierPF2e[];
} {
    const synthetics = extractModifiers(...args);
    return {
        main: synthetics.filter((m) => m.category !== "persistent"),
        persistent: synthetics.filter((m) => m.category === "persistent"),
    };
}

function extractModifierAdjustments(
    adjustmentsRecord: RuleElementSynthetics["modifierAdjustments"],
    selectors: string[],
    slug: string
): ModifierAdjustment[] {
    const adjustments = Array.from(new Set(selectors.flatMap((s) => adjustmentsRecord[s] ?? [])));
    return adjustments.filter((a) => [slug, null].includes(a.slug));
}

/** Extracts a list of all cloned notes across all given keys in a single list. */
function extractNotes(rollNotes: Record<string, RollNotePF2e[]>, selectors: string[]) {
    return selectors.flatMap((s) => (rollNotes[s] ?? []).map((n) => n.clone()));
}

function extractDamageDice(
    deferredDice: DamageDiceSynthetics,
    selectors: string[],
    options: DeferredValueParams = {}
): DamageDicePF2e[] {
    return selectors.flatMap((s) => deferredDice[s] ?? []).flatMap((d) => d(options) ?? []);
}

function extractRollTwice(
    rollTwices: Record<string, RollTwiceSynthetic[]>,
    selectors: string[],
    options: Set<string>
): RollTwiceOption {
    const twices = selectors.flatMap((s) => rollTwices[s] ?? []).filter((rt) => rt.predicate?.test(options) ?? true);
    if (twices.length === 0) return false;
    if (twices.some((rt) => rt.keep === "higher") && twices.some((rt) => rt.keep === "lower")) {
        return false;
    }

    return twices.at(0)?.keep === "higher" ? "keep-higher" : "keep-lower";
}

function extractRollSubstitutions(
    substitutions: Record<string, RollSubstitution[]>,
    domains: string[],
    rollOptions: Set<string>
): RollSubstitution[] {
    return domains
        .flatMap((d) => deepClone(substitutions[d] ?? []))
        .filter((s) => s.predicate?.test(rollOptions) ?? true);
}

function extractDegreeOfSuccessAdjustments(
    synthetics: Pick<RuleElementSynthetics, "degreeOfSuccessAdjustments">,
    selectors: string[]
): DegreeOfSuccessAdjustment[] {
    return Object.values(pick(synthetics.degreeOfSuccessAdjustments, selectors)).flat();
}

function isBracketedValue(value: unknown): value is BracketedValue {
    return isObject<{ brackets?: unknown }>(value) && Array.isArray(value.brackets);
}

async function processPreUpdateActorHooks(
    changed: DocumentUpdateData<ActorPF2e>,
    { pack }: { pack: string | null }
): Promise<void> {
    const actorId = String(changed._id);
    const actor = pack ? await game.packs.get(pack)?.getDocument(actorId) : game.actors.get(actorId);
    if (!(actor instanceof ActorPF2e)) return;

    // Run preUpdateActor rule element callbacks
    type WithPreUpdateActor = RuleElementPF2e & {
        preUpdateActor: NonNullable<RuleElementPF2e["preUpdateActor"]>;
    };
    const rules = actor.rules.filter((r): r is WithPreUpdateActor => !!r.preUpdateActor);
    if (rules.length === 0) return;

    actor.flags.pf2e.rollOptions = actor.clone(changed, { keepId: true }).flags.pf2e.rollOptions;
    const createDeletes = (
        await Promise.all(
            rules.map(
                (r): Promise<{ create: ItemSourcePF2e[]; delete: string[] }> =>
                    actor.items.has(r.item.id) ? r.preUpdateActor() : new Promise(() => ({ create: [], delete: [] }))
            )
        )
    ).reduce(
        (combined, cd) => ({
            create: [...combined.create, ...cd.create],
            delete: Array.from(new Set([...combined.delete, ...cd.delete])),
        }),
        { create: [], delete: [] }
    );
    createDeletes.delete = createDeletes.delete.filter((id) => actor.items.has(id));

    await actor.createEmbeddedDocuments("Item", createDeletes.create, { keepId: true, render: false });
    await actor.deleteEmbeddedDocuments("Item", createDeletes.delete, { render: false });
}

export {
    extractDamageDice,
    extractDamageModifiers,
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
    isBracketedValue,
    processPreUpdateActorHooks,
};
