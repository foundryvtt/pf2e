import { ItemPF2e } from "@item";
import { ArrayField, ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./";
import { ActionCost, SimpleAction } from "@actor/actions";
import { ActorPF2e } from "@actor";

const { fields } = foundry.data;

class SimpleActionRuleElement extends RuleElementPF2e<ActionSchema> {
    static override defineSchema(): ActionSchema {
        return {
            ...super.defineSchema(),
            description: new fields.StringField({ required: false, blank: true, initial: undefined }),
            effect: new fields.StringField({ required: false, blank: false, initial: undefined }),
            img: new fields.StringField({ required: false, blank: false, initial: undefined }),
            name: new fields.StringField({ required: true, blank: false, initial: undefined }),
            traits: new fields.ArrayField(new fields.StringField({ required: false, blank: false })),
        };
    }

    readonly #cost?: ActionCost;
    readonly #description: string;
    readonly #effect?: string;
    readonly #img?: string;
    /** The name of the action */
    readonly #name: string;
    readonly #traits?: string[];
    readonly #variants: ActionVariantData[];

    constructor(source: ActionSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        super(source, item, options);

        if (this.#isValid(source)) {
            this.#cost = source.cost;
            this.#description = source.description?.trim() ?? "";
            this.#effect = source.effect;
            this.#img = source.img;
            this.#name = source.name;
            this.#traits = source.traits;
            this.#variants = source.variants ?? [];
        } else {
            this.#description = "";
            this.#name = "";
            this.#variants = [];
        }
    }

    #isValid(source: ActionSource): source is ActionData {
        return typeof source.name === "string";
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const cost = this.resolveInjectedProperties(this.#cost);
        const variants = this.#variants.map((variant) => {
            return {
                cost: this.resolveInjectedProperties(variant.cost) ?? cost,
                description: this.resolveInjectedProperties(variant.description),
                effect: this.resolveInjectedProperties(variant.effect),
                name: this.resolveInjectedProperties(variant.name),
                slug: this.resolveInjectedProperties(variant.slug),
                traits: variant.traits,
            };
        });
        const action = new SimpleAction({
            cost,
            description: this.resolveInjectedProperties(this.#description),
            effect: this.resolveInjectedProperties(this.#effect),
            img: this.resolveInjectedProperties(this.#img),
            name: this.resolveInjectedProperties(this.#name)?.trim() || this.label,
            slug: this.resolveInjectedProperties(this.slug),
            traits: this.#traits,
            variants,
        });
        this.actor.synthetics.actions.push(action);
    }
}

interface SimpleActionRuleElement extends RuleElementPF2e<ActionSchema>, ModelPropsFromSchema<ActionSchema> {}

type ActionSchema = RuleElementSchema & {
    description: StringField<string, string, false, false, false>;
    effect: StringField<string, string, false, false, false>;
    img: StringField<string, string, false, false, false>;
    name: StringField<string, string, true, false, false>;
    traits: ArrayField<StringField<string, string, false, false, true>>;
};

interface ActionVariantSource {
    cost?: unknown;
    description?: unknown;
    effect?: unknown;
    name?: unknown;
    slug?: unknown;
    traits?: unknown;
}

interface ActionVariantData extends ActionVariantSource {
    cost?: ActionCost;
    description?: string;
    effect?: string;
    name: string;
    slug?: string;
    traits?: string[];
}

interface ActionSource extends RuleElementSource {
    cost?: unknown;
    description?: unknown;
    effect?: unknown;
    img?: unknown;
    name?: unknown;
    traits?: unknown;
    variants?: unknown;
}

interface ActionData extends ActionSource {
    cost?: ActionCost;
    description?: string;
    effect?: string;
    img?: string;
    name: string;
    traits?: string[];
    variants: ActionVariantData[];
}

export { SimpleActionRuleElement };
