import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { getActionGlyph, sluggify } from "@util";
import {
    Action,
    ActionCost,
    ActionMessageOptions,
    ActionUseOptions,
    ActionVariant,
    ActionVariantUseOptions,
} from "./types.ts";

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

    get cost(): ActionCost | undefined {
        return this.#cost ?? this.#action.cost;
    }

    get description(): string | undefined {
        return this.#description?.trim() || this.#action.description;
    }

    get glyph(): string {
        return getActionGlyph(this.cost ?? null);
    }

    get slug(): string {
        return this.#slug || sluggify(this.name ?? "") || this.#action.slug;
    }

    get traits(): string[] {
        return this.#traits ?? this.#action.traits;
    }

    async toMessage(options?: Partial<ActionMessageOptions>): Promise<ChatMessagePF2e | undefined> {
        const description = this.description || this.#action.description;
        const name = this.name
            ? `${game.i18n.localize(this.#action.name)} - ${game.i18n.localize(this.name)}`
            : game.i18n.localize(this.#action.name);
        const traitLabels: Record<string, string | undefined> = CONFIG.PF2E.actionTraits;
        const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
        const traits = this.traits.map((trait) => ({
            description: traitDescriptions[trait],
            label: traitLabels[trait] ?? trait,
            slug: trait,
        }));
        const content = await renderTemplate("/systems/pf2e/templates/actors/actions/base/chat-message-content.hbs", {
            description,
            glyph: this.glyph,
            name,
            traits,
        });
        return ChatMessagePF2e.create({
            blind: options?.blind,
            content,
            whisper: options?.whisper,
        });
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

    get glyph(): string {
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

    get variants(): Collection<TAction> {
        const variants: [string, TAction][] = this.#variants.map((variant) => [variant.slug, variant]);
        return new Collection(variants);
    }

    protected async getDefaultVariant(options?: { variant?: string }): Promise<TAction> {
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
        return variant ?? this.toActionVariant();
    }

    async toMessage(options?: Partial<ActionMessageOptions>): Promise<ChatMessagePF2e | undefined> {
        // use the data from the action to construct the message if no variant is specified
        const variant = options?.variant ? await this.getDefaultVariant(options) : undefined;
        return (variant ?? this.toActionVariant()).toMessage(options);
    }

    async use(options?: Partial<ActionUseOptions>): Promise<unknown> {
        const variant = await this.getDefaultVariant(options);
        return (variant ?? this.toActionVariant()).use(options);
    }

    protected abstract toActionVariant(data?: TData): TAction;
}

export { BaseAction, BaseActionData, BaseActionVariant, BaseActionVariantData };
