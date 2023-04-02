import { Action, ActionCost, ActionUseOptions, ActionVariant, ActionVariantUseOptions } from "./types";
import { getActionGlyph, sluggify } from "@util";

interface BaseActionVariantData {
    cost?: ActionCost;
    description?: string;
    name?: string;
    slug?: string;
    traits?: string[];
}

interface BaseActionData<ActionVariantDataType extends BaseActionVariantData = BaseActionVariantData> {
    cost?: ActionCost;
    description: string;
    img?: string;
    name: string;
    slug?: string | null;
    traits?: string[];
    variants?: ActionVariantDataType | ActionVariantDataType[];
}

abstract class BaseActionVariant implements ActionVariant {
    readonly #action: BaseAction<BaseActionVariantData, BaseActionVariant>;
    readonly #cost?: ActionCost;
    readonly #description?: string;
    readonly name?: string;
    readonly #slug?: string;
    readonly #traits?: string[];

    protected constructor(action: BaseAction<BaseActionVariantData, BaseActionVariant>, data?: BaseActionVariantData) {
        this.#action = action;
        if (data) {
            this.#cost = data.cost;
            this.#description = data.description;
            this.name = data.name?.trim();
            this.#slug = data.slug?.trim();
            this.#traits = data.traits;
        }
    }

    get cost() {
        return this.#cost ?? this.#action.cost;
    }

    get description() {
        return this.#description?.trim() || this.#action.description;
    }

    get glyph() {
        return getActionGlyph(this.cost ?? null);
    }

    get slug() {
        return this.#slug || sluggify(this.name ?? "") || this.#action.slug;
    }

    get traits() {
        return this.#traits ?? this.#action.traits;
    }

    abstract use(options?: Partial<ActionVariantUseOptions>): Promise<unknown>;
}

abstract class BaseAction<TData extends BaseActionVariantData, TAction extends BaseActionVariant> implements Action {
    readonly cost?: ActionCost;
    readonly description?: string;
    readonly img?: string;
    readonly name: string;
    readonly slug: string;
    readonly traits: string[];
    readonly #variants: TAction[];

    protected constructor(data: BaseActionData<TData>) {
        this.cost = data.cost;
        this.description = data.description;
        this.img = data.img;
        this.name = data.name.trim();
        this.slug = data.slug?.trim() || sluggify(this.name);
        this.traits = data.traits ?? [];
        this.#variants = Array.isArray(data.variants)
            ? data.variants.map(this.toActionVariant.bind(this))
            : data.variants
            ? [this.toActionVariant(data.variants)]
            : [];
    }

    get glyph() {
        if (this.#variants.length === 1) {
            return this.#variants[0].glyph;
        }
        const numbers = this.#variants.filter((variant) => typeof variant.cost === "number").sort();
        if (this.#variants.length === numbers.length && numbers.length > 1) {
            const first = numbers.shift()?.cost;
            const last = numbers.pop()?.cost;
            const key =
                first === last
                    ? String(first)
                    : first === 2 || last === 2
                    ? `${first} or ${last}`
                    : `${first} to ${last}`;
            return getActionGlyph(key);
        }
        return getActionGlyph(this.cost ?? "");
    }

    get variants() {
        const variants: [string, ActionVariant][] = this.#variants.map((variant) => [variant.slug, variant]);
        return new Collection(variants);
    }

    use(options?: Partial<ActionUseOptions>): Promise<unknown> {
        const variants = this.variants;
        if (options?.variant && !variants.size) {
            const reason = game.i18n.format("PF2E.ActionsWarning.Variants.None", {
                action: this.name,
                variant: options.variant,
            });
            return Promise.reject(reason);
        }
        if (!options?.variant && variants.size > 1) {
            const reason = game.i18n.format("PF2E.ActionsWarning.Variants.Multiple", {
                action: this.name,
            });
            return Promise.reject(reason);
        }
        const variant = variants.get(options?.variant ?? "");
        if (options?.variant && !variant) {
            const reason = game.i18n.format("PF2E.ActionsWarning.Variants.Nonexisting", {
                action: this.name,
                variant: options.variant,
            });
            return Promise.reject(reason);
        }
        return (variant ?? this.toActionVariant()).use(options);
    }

    protected abstract toActionVariant(data?: TData): TAction;
}

export { BaseAction, BaseActionData, BaseActionVariant, BaseActionVariantData };
