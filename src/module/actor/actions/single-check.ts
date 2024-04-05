import { ActorPF2e } from "@actor";
import { ModifierPF2e, RawModifier, StatisticModifier } from "@actor/modifiers.ts";
import { DCSlug } from "@actor/types.ts";
import { DC_SLUGS } from "@actor/values.ts";
import type { ItemPF2e } from "@item";
import { TokenPF2e } from "@module/canvas/index.ts";
import { RollNotePF2e, RollNoteSource } from "@module/notes.ts";
import { ActionMacroHelpers } from "@system/action-macros/index.ts";
import {
    ActionGlyph,
    CheckContextData,
    CheckContextOptions,
    CheckMacroContext,
    CheckResultCallback,
} from "@system/action-macros/types.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import { getActionGlyph, isObject, setHasElement } from "@util";
import { BaseAction, BaseActionData, BaseActionVariant, BaseActionVariantData } from "./base.ts";
import { ActionUseOptions } from "./types.ts";

type SingleCheckActionRollNoteData = Omit<RollNoteSource, "selector"> & { selector?: string };
function toRollNoteSource(data: SingleCheckActionRollNoteData): RollNoteSource {
    data.selector ??= "";
    return data as RollNoteSource;
}

function isValidDifficultyClass(dc: unknown): dc is CheckDC | DCSlug {
    return setHasElement(DC_SLUGS, dc) || (isObject<{ value: unknown }>(dc) && typeof dc.value === "number");
}

interface SingleCheckActionVariantData extends BaseActionVariantData {
    difficultyClass?: CheckDC | DCSlug;
    modifiers?: RawModifier[];
    notes?: SingleCheckActionRollNoteData[];
    rollOptions?: string[];
    statistic?: string | string[];
}

interface SingleCheckActionData extends BaseActionData<SingleCheckActionVariantData> {
    difficultyClass?: CheckDC | DCSlug;
    modifiers?: RawModifier[];
    notes?: SingleCheckActionRollNoteData[];
    rollOptions?: string[];
    statistic: string | string[];
}

interface ActionVariantCheckPreviewOptions {
    actor: ActorPF2e;
}

interface ActionCheckPreviewOptions extends ActionVariantCheckPreviewOptions {
    variant: string;
}

interface ActionCheckPreview {
    label: string;
    modifier?: number;
    slug: string;
}

interface SingleCheckActionUseOptions extends ActionUseOptions {
    difficultyClass: CheckDC | DCSlug | number;
    modifiers: ModifierPF2e[];
    multipleAttackPenalty: number;
    notes: SingleCheckActionRollNoteData[];
    rollOptions: string[];
    statistic: string;
}

class SingleCheckActionVariant extends BaseActionVariant {
    readonly #action: SingleCheckAction;
    readonly #difficultyClass?: CheckDC | DCSlug;
    readonly #modifiers?: RawModifier[];
    readonly #notes?: RollNoteSource[];
    readonly #rollOptions?: string[];
    readonly #statistic?: string | string[];

    constructor(action: SingleCheckAction, data?: SingleCheckActionVariantData) {
        super(action, data);
        this.#action = action;
        if (data) {
            this.#difficultyClass = data.difficultyClass;
            this.#modifiers = data?.modifiers;
            this.#notes = data.notes ? data.notes.map(toRollNoteSource) : undefined;
            this.#rollOptions = data.rollOptions;
            this.#statistic = data.statistic;
        }
    }

    get difficultyClass(): CheckDC | DCSlug | undefined {
        return this.#difficultyClass ?? this.#action.difficultyClass;
    }

    get modifiers(): RawModifier[] {
        return this.#modifiers ?? this.#action.modifiers;
    }

    get notes(): RollNoteSource[] {
        return this.#notes ?? this.#action.notes;
    }

    get rollOptions(): string[] {
        return this.#rollOptions ?? this.#action.rollOptions;
    }

    get statistic(): string | string[] {
        return this.#statistic ?? this.#action.statistic;
    }

    preview(options: Partial<ActionVariantCheckPreviewOptions> = {}): ActionCheckPreview[] {
        const slugs = this.#statistic || this.#action.statistic;
        const candidates = Array.isArray(slugs) ? slugs : [slugs];

        // TODO: append relevant statistic replacements from the actor

        return candidates
            .map((candidate) =>
                this.toActionCheckPreview({ actor: options.actor, rollOptions: this.rollOptions, slug: candidate }),
            )
            .filter((preview): preview is ActionCheckPreview => !!preview);
    }

    override async use(options: Partial<SingleCheckActionUseOptions> = {}): Promise<CheckResultCallback[]> {
        const modifiers = this.modifiers.map((raw) => new ModifierPF2e(raw)).concat(options.modifiers ?? []);
        if (options.multipleAttackPenalty) {
            const map = options.multipleAttackPenalty;
            const modifier = map > 0 ? Math.min(2, map) * -5 : map;
            modifiers.push(new ModifierPF2e({ label: "PF2E.MultipleAttackPenalty", modifier }));
        }
        const notes = (this.notes as SingleCheckActionRollNoteData[])
            .concat(options.notes ?? [])
            .map(toRollNoteSource)
            .map((note) => new RollNotePF2e(note));
        const rollOptions = this.rollOptions.concat(options.rollOptions ?? []);
        const slug = options.statistic?.trim() || (Array.isArray(this.statistic) ? this.statistic[0] : this.statistic);
        const title = this.name
            ? `${game.i18n.localize(this.#action.name)} - ${game.i18n.localize(this.name)}`
            : game.i18n.localize(this.#action.name);
        const difficultyClass = Number.isNumeric(options.difficultyClass)
            ? { value: Number(options.difficultyClass) }
            : isValidDifficultyClass(options.difficultyClass)
              ? options.difficultyClass
              : this.difficultyClass;
        const results: CheckResultCallback[] = [];

        await ActionMacroHelpers.simpleRollActionCheck({
            actors: options.actors,
            title,
            actionGlyph: getActionGlyph(this.cost ?? null) as ActionGlyph,
            callback: (result) => results.push(result),
            checkContext: (opts) => this.checkContext(opts, { modifiers, rollOptions, slug }),
            difficultyClass,
            event: options.event,
            extraNotes: (selector) =>
                notes.map((note) => {
                    note.selector ||= selector; // treat empty selectors as always applicable to this check
                    return note;
                }),
            target: () => {
                if (options.target instanceof ActorPF2e) {
                    return { token: null, actor: options.target };
                } else if (options.target instanceof TokenPF2e) {
                    return options.target.actor
                        ? { token: options.target.document, actor: options.target.actor }
                        : null;
                }
                return null;
            },
            traits: this.traits.concat(options?.traits ?? []),
        });

        return results;
    }

    protected checkContext<ItemType extends ItemPF2e<ActorPF2e>>(
        opts: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>,
    ): CheckMacroContext<ItemType> | undefined {
        return ActionMacroHelpers.defaultCheckContext(opts, data);
    }

    protected toActionCheckPreview(args: {
        actor?: ActorPF2e;
        rollOptions: string[];
        slug: string;
    }): ActionCheckPreview | null {
        if (args.actor) {
            const statistic = args.actor.getStatistic(args.slug);
            if (statistic) {
                const modifier = new StatisticModifier(args.slug, statistic.modifiers, args.rollOptions);
                return { label: statistic.label, modifier: modifier.totalModifier, slug: args.slug };
            }
        } else {
            const labels: Record<string, string> = {
                perception: "PF2E.PerceptionLabel",
                ...CONFIG.PF2E.saves,
                ...CONFIG.PF2E.skillList,
            };
            return { label: game.i18n.localize(labels[args.slug] ?? args.slug), slug: args.slug };
        }
        return null;
    }
}

class SingleCheckAction extends BaseAction<SingleCheckActionVariantData, SingleCheckActionVariant> {
    readonly difficultyClass?: CheckDC | DCSlug;
    readonly modifiers: RawModifier[];
    readonly notes: RollNoteSource[];
    readonly rollOptions: string[];
    readonly statistic: string | string[];

    constructor(data: SingleCheckActionData) {
        super(data);
        this.difficultyClass = data.difficultyClass;
        this.modifiers = data.modifiers ?? [];
        this.notes = (data.notes ?? []).map(toRollNoteSource);
        this.rollOptions = data.rollOptions ?? [];
        this.statistic = data.statistic;
    }

    preview(options: Partial<ActionCheckPreviewOptions> = {}): ActionCheckPreview[] {
        return this.getDefaultVariant(options).preview(options);
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new SingleCheckActionVariant(this, data);
    }
}

export { SingleCheckAction, SingleCheckActionVariant };
export type { ActionCheckPreview, SingleCheckActionUseOptions, SingleCheckActionVariantData };
