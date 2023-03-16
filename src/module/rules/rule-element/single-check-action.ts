import { ItemPF2e } from "@item";
import { ArrayField, ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./";
import { ActionCost, SingleCheckAction } from "@actor/actions";
import { CheckDC } from "@system/degree-of-success";
import { RollNoteSource } from "@module/notes";
import { ActorPF2e } from "@actor";

const { fields } = foundry.data;

function toDifficultyClass(value?: string | number | CheckDC): string | CheckDC | undefined {
    return typeof value === "number" ? { value } : value;
}

class SingleCheckActionRuleElement extends RuleElementPF2e<ActionSchema> {
    static override defineSchema(): ActionSchema {
        return {
            ...super.defineSchema(),
            description: new fields.StringField({ required: false, blank: true, initial: undefined }),
            img: new fields.StringField({ required: false, blank: false, initial: undefined }),
            name: new fields.StringField({ required: true, blank: false, initial: undefined }),
            statistic: new fields.StringField({ required: true, blank: false, initial: undefined }),
            traits: new fields.ArrayField(new fields.StringField({ required: false, blank: false })),
        };
    }

    readonly #cost?: ActionCost;
    readonly #description: string;
    readonly #difficultyClass?: string | number | CheckDC;
    readonly #img?: string;
    /** The name of the action */
    readonly #name: string;
    readonly #notes?: (RollNoteSource & { selector?: string })[];
    readonly #rollOptions?: string[];
    readonly #statistic: string;
    readonly #traits?: string[];
    readonly #variants: ActionVariantData[];

    constructor(source: ActionSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        super(source, item, options);

        if (this.#isValid(source)) {
            this.#cost = source.cost;
            this.#description = source.description?.trim() ?? "";
            this.#difficultyClass = source.difficultyClass;
            this.#statistic = source.statistic;
            this.#img = source.img;
            this.#name = source.name;
            this.#notes = source.notes;
            this.#rollOptions = source.rollOptions;
            this.#traits = source.traits;
            this.#variants = source.variants ?? [];
        } else {
            this.#description = "";
            this.#name = "";
            this.#statistic = "";
            this.#variants = [];
        }
    }

    #isValid(source: ActionSource): source is ActionData {
        return typeof source.name === "string";
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const cost = this.resolveInjectedProperties(this.#cost);
        const statistic: string = this.resolveInjectedProperties(this.#statistic);
        const variants = this.#variants.map((variant) => {
            return {
                cost: this.resolveInjectedProperties(variant.cost) ?? cost,
                description: this.resolveInjectedProperties(variant.description),
                difficultyClass: toDifficultyClass(variant.difficultyClass),
                name: this.resolveInjectedProperties(variant.name),
                notes: variant.notes,
                rollOptions: variant.rollOptions,
                slug: this.resolveInjectedProperties(variant.slug),
                statistic: this.resolveInjectedProperties(this.#statistic),
                traits: variant.traits,
            };
        });
        const action = new SingleCheckAction({
            cost,
            description: this.resolveInjectedProperties(this.#description),
            difficultyClass: toDifficultyClass(this.#difficultyClass),
            img: this.resolveInjectedProperties(this.#img),
            name: this.resolveInjectedProperties(this.#name)?.trim() || this.label,
            notes: this.#notes,
            rollOptions: this.#rollOptions,
            slug: this.resolveInjectedProperties(this.slug),
            statistic,
            traits: this.#traits,
            variants,
        });
        this.actor.synthetics.actions.push(action);
    }
}

interface SingleCheckActionRuleElement extends RuleElementPF2e<ActionSchema>, ModelPropsFromSchema<ActionSchema> {}

type ActionSchema = RuleElementSchema & {
    description: StringField<string, string, false, false, false>;
    img: StringField<string, string, false, false, false>;
    name: StringField<string, string, true, false, false>;
    statistic: StringField<string, string, true, false, false>;
    traits: ArrayField<StringField<string, string, false, false, true>>;
};

interface ActionVariantSource {
    cost?: unknown;
    description?: unknown;
    difficultyClass?: unknown;
    name?: unknown;
    notes?: unknown;
    rollOptions?: unknown;
    slug?: unknown;
    statistic?: unknown;
    traits?: unknown;
}

interface ActionVariantData extends ActionVariantSource {
    cost?: ActionCost;
    description?: string;
    difficultyClass?: string | number | CheckDC;
    name: string;
    notes?: (Omit<RollNoteSource, "selector"> & { selector?: string })[];
    rollOptions?: string[];
    slug?: string;
    statistic: string;
    traits?: string[];
}

interface ActionSource extends RuleElementSource {
    cost?: unknown;
    description?: unknown;
    difficultyClass?: unknown;
    img?: unknown;
    name?: unknown;
    notes?: unknown;
    rollOptions?: string[];
    statistic?: unknown;
    traits?: unknown;
    variants?: unknown;
}

interface ActionData extends ActionSource {
    cost?: ActionCost;
    description?: string;
    difficultyClass?: string | number | CheckDC;
    img?: string;
    name: string;
    notes?: (RollNoteSource & { selector?: string })[];
    rollOptions?: string[];
    statistic: string;
    traits?: string[];
    variants: ActionVariantData[];
}

export { SingleCheckActionRuleElement };
