import type { CreaturePF2e } from "@actor";
import type { AttributeString } from "@actor/types.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { MagicTradition } from "@item/spell/types.ts";
import type { SpellcastingEntrySource } from "@item/spellcasting-entry/data.ts";
import { SpellcastingEntryPF2e } from "@item";
import type { SpellcastingCategory } from "@item/spellcasting-entry/types.ts";
import type { OneToTen } from "@module/data.ts";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { ErrorPF2e, ordinalString } from "@util";
import * as R from "remeda";
import Root from "./app.svelte";

interface SpellcastingEntryDialogConfiguration extends fa.ApplicationConfiguration {
    /** The actor the entry belongs to, or will be created on */
    actor: CreaturePF2e;
    /** The entry being edited, or null when creating a new one */
    entry: SpellcastingEntryPF2e<CreaturePF2e> | null;
}

/** Creates or edits a spellcasting entry from a local draft. Nothing is written until the user confirms. */
class SpellcastingEntryDialog extends SvelteApplicationMixin<
    AbstractConstructorOf<fa.api.ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<SpellcastingEntryDialogConfiguration> }
>(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<SpellcastingEntryDialogConfiguration> = {
        id: "{id}",
        position: { width: 420, height: "auto" },
        window: { title: "PF2E.SpellcastingSettings.Title", contentClasses: ["standard-form"] },
    };

    declare options: SpellcastingEntryDialogConfiguration;

    protected root = Root;

    /** One dialog per entry, and one pending creation per actor */
    static #instanceId(options: { actor: CreaturePF2e; entry: SpellcastingEntryPF2e | null }): string {
        return options.entry
            ? `spellcasting-entry-dialog-${options.entry.uuid}`
            : `spellcasting-entry-dialog-create-${options.actor.uuid}`;
    }

    constructor(
        options: DeepPartial<fa.ApplicationConfiguration> &
            Pick<SpellcastingEntryDialogConfiguration, "actor" | "entry">,
    ) {
        const existing = foundry.applications.instances.get(SpellcastingEntryDialog.#instanceId(options));
        if (existing instanceof SpellcastingEntryDialog) return existing;
        super(options);
    }

    get actor(): CreaturePF2e {
        return this.options.actor;
    }

    get entry(): SpellcastingEntryPF2e<CreaturePF2e> | null {
        return this.options.entry;
    }

    protected override _initializeApplicationOptions(
        options: Partial<SpellcastingEntryDialogConfiguration>,
    ): SpellcastingEntryDialogConfiguration {
        const initialized = super._initializeApplicationOptions(options) as SpellcastingEntryDialogConfiguration;
        if (!initialized.actor) throw ErrorPF2e("Spellcasting dialog requires an actor");
        initialized.entry ??= null;
        initialized.uniqueId = SpellcastingEntryDialog.#instanceId(initialized);
        return initialized;
    }

    /**
     * Actor registration keeps the option lists current, entry registration closes this on deletion.
     * The draft lives in the component and survives re-renders.
     */
    protected override async _onFirstRender(
        context: fa.ApplicationRenderContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.actor.apps[this.id] = this;
        if (this.entry) this.entry.apps[this.id] = this;
    }

    protected override _tearDown(options: fa.ApplicationClosingOptions): void {
        delete this.actor.apps[this.id];
        if (this.entry) delete this.entry.apps[this.id];
        super._tearDown(options);
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SpellcastingEntryDialogContext> {
        const actor = this.actor;
        const entry = this.entry;
        const isCharacter = actor.isOfType("character");
        const localizeRecord = (record: Record<string, string>): FormSelectOption[] =>
            Object.entries(record).map(([value, key]) => ({ value, label: _loc(key) }));

        const classDCs = isCharacter
            ? Object.values(actor.system.proficiencies.classDCs).filter((cdc) => cdc.rank > 0)
            : [];
        // Standalone rollables (e.g. Fulcrum Lens) have no attribute and are not proficiencies
        const statistics: StatisticOption[] = [
            ...actor.synthetics.statistics
                .values()
                .flatMap((s) => (s.attribute ? [{ slug: s.slug, label: s.label, attribute: s.attribute }] : [])),
            ...classDCs.map((c) => ({
                slug: c.slug,
                label: _loc("PF2E.Actor.Character.ClassDC.LabelSpecific", { class: c.label }),
                attribute: c.attribute,
            })),
        ];

        // Rituals live elsewhere, and characters cast from items without an entry
        const excludedTypes = new Set<string>(["ritual", isCharacter ? "items" : ""]);
        const source = entry?._source.system ?? null;
        const initialType = source?.prepared.value ?? "innate";
        const spellcastingTypes = localizeRecord(
            R.pickBy(CONFIG.PF2E.preparationType, (_v, k) => k === initialType || !excludedTypes.has(k)),
        );

        return {
            ...(await super._prepareContext(options)),
            foundryApp: this,
            state: {
                mode: entry ? "edit" : "create",
                isCharacter,
                isNPC: actor.isOfType("npc"),
                spellcastingTypes,
                magicTraditions: localizeRecord(CONFIG.PF2E.magicTraditions),
                attributes: localizeRecord(CONFIG.PF2E.abilities),
                statistics,
                autoHeightenRanks: R.range(1, 11).map((rank) => ({
                    value: rank.toString(),
                    label: _loc("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) }),
                })),
                validItemTypes: [
                    { value: "scroll", label: _loc("PF2E.Actor.Creature.Spellcasting.ValidItemTypes.Scroll") },
                ],
                initial: {
                    type: initialType,
                    flexible: !!source?.prepared.flexible,
                    validItems: source?.prepared.validItems ?? "",
                    proficiencySlug: source?.proficiency.slug ?? "",
                    tradition: source?.tradition.value ?? "arcane",
                    attribute: source?.ability.value || "cha",
                    autoHeightenLevel: source?.autoHeightenLevel.value ?? null,
                },
            },
        };
    }

    /** A resolvable statistic supplies the attribute, so none is stored. A dangling slug keeps the entry's own */
    #storedAttribute(draft: Pick<SpellcastingDraft, "attribute" | "proficiencySlug">): AttributeString | "" {
        const supplied = draft.proficiencySlug ? this.actor.getStatistic(draft.proficiencySlug)?.attribute : null;
        return supplied ? "" : draft.attribute;
    }

    /**
     * Attack and DC the entry would have with this draft, built like a saved entry's statistic.
     * Null for NPCs (their numbers come from spelldc) or if it cannot be built.
     */
    previewStatistic(
        draft: Pick<SpellcastingDraft, "type" | "tradition" | "attribute" | "proficiencySlug">,
    ): StatisticPreview | null {
        const actor = this.actor;
        if (!actor.isOfType("character")) return null;

        const base: DeepPartial<SpellcastingEntrySource> = this.entry
            ? R.omit(this.entry.toObject(), ["_id"])
            : { name: "Untitled", type: "spellcastingEntry" };
        const source = fu.mergeObject(
            base,
            {
                system: {
                    prepared: { value: draft.type },
                    tradition: { value: draft.tradition },
                    ability: { value: this.#storedAttribute(draft) },
                    proficiency: { slug: draft.proficiencySlug },
                },
            },
            { inplace: false },
        );
        try {
            const statistic = new SpellcastingEntryPF2e(source, { parent: actor }).buildStatistic();
            return statistic ? { attack: statistic.check.mod, dc: statistic.dc.value } : null;
        } catch (error) {
            // A preview shouldn't take the form down with it
            console.error(error);
            return null;
        }
    }

    async confirm(draft: SpellcastingDraft): Promise<void> {
        const actor = this.actor;
        const entry = this.entry;
        const isPrepared = draft.type === "prepared";
        const system: DeepPartial<SpellcastingEntrySource["system"]> = {
            prepared: {
                value: draft.type,
                ...(isPrepared ? { flexible: draft.flexible } : {}),
                ...(draft.type === "items" ? { validItems: draft.validItems } : {}),
            },
            tradition: { value: draft.tradition },
            ability: { value: this.#storedAttribute(draft) },
            ...(actor.isOfType("character") ? { proficiency: { slug: draft.proficiencySlug } } : {}),
            autoHeightenLevel: { value: draft.autoHeightenLevel },
        };

        if (!entry) {
            const tradition = draft.type === "items" || !draft.tradition ? null : draft.tradition;
            const preparationType = _loc(CONFIG.PF2E.preparationType[draft.type]);
            const traditionSpells = tradition ? _loc(CONFIG.PF2E.magicTraditions[tradition]) : "";
            const name = traditionSpells
                ? _loc("PF2E.SpellCastingFormat", { preparationType, traditionSpells })
                : preparationType;
            const data: DeepPartial<SpellcastingEntrySource> = {
                name,
                type: "spellcastingEntry",
                system: { ...system, spelldc: { value: 0, dc: 0 } },
            };
            await actor.createEmbeddedDocuments("Item", [data]);
        } else {
            const actualEntry = actor.spellcasting.get(entry.id);
            if (!(actualEntry instanceof SpellcastingEntryPF2e)) return;
            await actualEntry.update({ system });
        }

        await this.close();
    }
}

interface StatisticPreview {
    attack: number;
    dc: number;
}

interface StatisticOption {
    slug: string;
    label: string;
    /** Replaces the entry's own attribute while the statistic is selected */
    attribute: AttributeString;
}

/** The user's working copy of the entry's settings */
interface SpellcastingDraft {
    type: SpellcastingCategory;
    flexible: boolean;
    validItems: "scroll" | "";
    proficiencySlug: string;
    tradition: MagicTradition | "";
    attribute: AttributeString;
    autoHeightenLevel: OneToTen | null;
}

interface SpellcastingEntryDialogState {
    mode: "create" | "edit";
    isCharacter: boolean;
    isNPC: boolean;
    spellcastingTypes: FormSelectOption[];
    magicTraditions: FormSelectOption[];
    attributes: FormSelectOption[];
    statistics: StatisticOption[];
    autoHeightenRanks: FormSelectOption[];
    validItemTypes: FormSelectOption[];
    initial: SpellcastingDraft;
}

interface SpellcastingEntryDialogContext extends SvelteApplicationRenderContext {
    foundryApp: SpellcastingEntryDialog;
    state: SpellcastingEntryDialogState;
}

/** Open the dialog to edit an existing entry, or to create a new one on an actor */
async function openSpellcastingEntryDialog(
    subject: CreaturePF2e | SpellcastingEntryPF2e<CreaturePF2e>,
): Promise<SpellcastingEntryDialog> {
    const [actor, entry] = subject instanceof SpellcastingEntryPF2e ? [subject.actor, subject] : [subject, null];
    return new SpellcastingEntryDialog({ actor, entry }).render({ force: true });
}

export { SpellcastingEntryDialog, openSpellcastingEntryDialog };
export type { SpellcastingEntryDialogContext, SpellcastingEntryDialogState, SpellcastingDraft, StatisticPreview };
