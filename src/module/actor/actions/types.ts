import { ActorPF2e } from "@actor";

const ACTION_COST = ["free", "reaction", 1, 2, 3] as const;
type ActionCost = (typeof ACTION_COST)[number];

interface ActionVariantUseOptions extends Record<string, unknown> {
    actors?: ActorPF2e | ActorPF2e[];
    event: Event;
}

interface ActionVariant {
    cost?: ActionCost;
    description?: string;
    glyph?: string;
    name?: string;
    slug: string;
    traits: string[];
    use(options?: Partial<ActionVariantUseOptions>): Promise<unknown>;
}

interface ActionUseOptions extends ActionVariantUseOptions {
    variant: string;
}

interface Action {
    cost?: ActionCost;
    description?: string;
    glyph?: string;
    img?: string;
    name: string;
    slug: string;
    traits: string[];
    variants: Collection<ActionVariant>;
    /** Uses the default variant for this action, which will usually be the first one in the collection. */
    use(options?: Partial<ActionUseOptions>): Promise<unknown>;
}

export { ACTION_COST, Action, ActionCost, ActionUseOptions, ActionVariant, ActionVariantUseOptions };
