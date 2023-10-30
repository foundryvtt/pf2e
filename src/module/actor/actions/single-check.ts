import type { ActorPF2e } from "@actor";
import { ModifierPF2e, RawModifier } from "@actor/modifiers.ts";
import { DCSlug } from "@actor/types.ts";
import { DC_SLUGS } from "@actor/values.ts";
import type { ItemPF2e } from "@item";
import { RollNotePF2e, RollNoteSource } from "@module/notes.ts";
import { ActionMacroHelpers } from "@system/action-macros/index.ts";
import {
    ActionGlyph,
    CheckContext,
    CheckContextData,
    CheckContextOptions,
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

interface SingleCheckActionVariantData extends BaseActionVariantData {
    difficultyClass?: CheckDC | DCSlug;
    modifiers?: RawModifier[];
    notes?: SingleCheckActionRollNoteData[];
    rollOptions?: string[];
    statistic?: string;
}

interface SingleCheckActionData extends BaseActionData<SingleCheckActionVariantData> {
    difficultyClass?: CheckDC | DCSlug;
    modifiers?: RawModifier[];
    notes?: SingleCheckActionRollNoteData[];
    rollOptions?: string[];
    statistic: string;
}

interface SingleCheckActionUseOptions extends ActionUseOptions {
    difficultyClass: CheckDC | string;
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
    readonly #statistic?: string;

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

    get statistic(): string {
        return this.#statistic ?? this.#action.statistic;
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
        const slug = options.statistic?.trim() || this.statistic;
        const title = this.name
            ? `${game.i18n.localize(this.#action.name)} - ${game.i18n.localize(this.name)}`
            : game.i18n.localize(this.#action.name);
        const results: CheckResultCallback[] = [];
        const difficultyClass =
            setHasElement(DC_SLUGS, options.difficultyClass) ||
            (isObject<{ value: unknown }>(options.difficultyClass) && typeof options.difficultyClass.value === "number")
                ? options.difficultyClass
                : this.difficultyClass;

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
            traits: this.traits.concat(options?.traits ?? []),
        });

        return results;
    }

    protected checkContext<ItemType extends ItemPF2e<ActorPF2e>>(
        opts: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>,
    ): CheckContext<ItemType> | undefined {
        return ActionMacroHelpers.defaultCheckContext(opts, data);
    }
}

class SingleCheckAction extends BaseAction<SingleCheckActionVariantData, SingleCheckActionVariant> {
    readonly difficultyClass?: CheckDC | DCSlug;
    readonly modifiers: RawModifier[];
    readonly notes: RollNoteSource[];
    readonly rollOptions: string[];
    readonly statistic: string;

    constructor(data: SingleCheckActionData) {
        super(data);
        this.difficultyClass = data.difficultyClass;
        this.modifiers = data.modifiers ?? [];
        this.notes = (data.notes ?? []).map(toRollNoteSource);
        this.rollOptions = data.rollOptions ?? [];
        this.statistic = data.statistic;
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new SingleCheckActionVariant(this, data);
    }
}

export { SingleCheckAction, SingleCheckActionVariant };
export type { SingleCheckActionUseOptions, SingleCheckActionVariantData };
