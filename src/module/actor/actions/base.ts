import type { AbilityTrait } from "@item/ability/index.ts";
import type { ProficiencyRank } from "@item/base/data/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { getActionGlyph, sluggify } from "@util";
import {
    Action,
    ActionCost,
    ActionMessageOptions,
    ActionSection,
    ActionUseOptions,
    ActionVariant,
    ActionVariantUseOptions,
} from "./types.ts";

interface BaseActionVariantData {
    cost?: ActionCost;
    description?: string;
    name?: string;
    slug?: string;
    traits?: AbilityTrait[];
}

interface BaseActionData<ActionVariantDataType extends BaseActionVariantData = BaseActionVariantData> {
    cost?: ActionCost;
    description: string;
    img?: string;
    name: string;
    sampleTasks?: Partial<Record<ProficiencyRank, string>>;
    section?: ActionSection;
    slug?: string | null;
    traits?: AbilityTrait[];
    variants?: ActionVariantDataType | ActionVariantDataType[];
}

function labelSampleTasks(sampleTasks: Partial<Record<ProficiencyRank, string>>): { label: string; text: string }[] {
    const unlabeled: { rank: ProficiencyRank; text: string }[] = [];
    let rank: keyof typeof sampleTasks;
    for (rank in sampleTasks) {
        unlabeled.push({ rank, text: sampleTasks[rank]! });
    }
    unlabeled.sort((t1, t2) => PROFICIENCY_RANKS.indexOf(t1.rank) - PROFICIENCY_RANKS.indexOf(t2.rank));
    return unlabeled.map((task) => ({ label: CONFIG.PF2E.proficiencyRanks[task.rank], text: task.text }));
}

abstract class BaseActionVariant implements ActionVariant {
    readonly #action: BaseAction<BaseActionVariantData, BaseActionVariant>;
    readonly #cost?: ActionCost;
    readonly #description?: string;
    readonly name?: string;
    readonly #slug?: string;
    readonly #traits?: AbilityTrait[];

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

    get traits(): AbilityTrait[] {
        return this.#traits ?? this.#action.traits;
    }

    async toMessage(options?: Partial<ActionMessageOptions>): Promise<ChatMessagePF2e | undefined> {
        const description = this.description || this.#action.description;
        const name = this.name
            ? `${game.i18n.localize(this.#action.name)} - ${game.i18n.localize(this.name)}`
            : game.i18n.localize(this.#action.name);
        const sampleTasks = this.#action.sampleTasks ? labelSampleTasks(this.#action.sampleTasks) : undefined;
        const traitLabels: Record<string, string | undefined> = CONFIG.PF2E.actionTraits;
        const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
        const traits = this.traits.map((trait) => ({
            description: traitDescriptions[trait],
            label: traitLabels[trait] ?? trait,
            slug: trait,
        }));
        const templatePath = `${SYSTEM_ROOT}/templates/actors/actions/base/chat-message-content.hbs`;
        const content = await fa.handlebars.renderTemplate(templatePath, {
            description,
            glyph: this.glyph,
            name,
            sampleTasks,
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
    readonly sampleTasks?: Partial<Record<ProficiencyRank, string>>;
    readonly section?: ActionSection;
    readonly slug: string;
    readonly traits: AbilityTrait[];
    readonly #variants: TAction[];

    protected constructor(data: BaseActionData<TData>) {
        this.cost = data.cost;
        this.description = data.description;
        this.img = data.img;
        this.name = data.name.trim();
        this.sampleTasks = data.sampleTasks;
        this.section = data.section;
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

    get variants(): Collection<string, TAction> {
        const variants: [string, TAction][] = this.#variants.map((variant) => [variant.slug, variant]);
        return new Collection(variants);
    }

    protected getDefaultVariant(options?: { variant?: string }): TAction {
        const variants = this.variants;
        if (options?.variant && !variants.size) {
            throw game.i18n.format("PF2E.ActionsWarning.Variants.None", {
                action: game.i18n.localize(this.name),
                variant: options.variant,
            });
        }
        if (!options?.variant && variants.size > 1) {
            throw game.i18n.format("PF2E.ActionsWarning.Variants.Multiple", {
                action: game.i18n.localize(this.name),
            });
        }
        const variant = variants.get(options?.variant ?? "");
        if (options?.variant && !variant) {
            throw game.i18n.format("PF2E.ActionsWarning.Variants.Nonexistent", {
                action: game.i18n.localize(this.name),
                variant: options.variant,
            });
        }
        return variant ?? this.toActionVariant();
    }

    async toMessage(options?: Partial<ActionMessageOptions>): Promise<ChatMessagePF2e | undefined> {
        return options?.variant
            ? this.getDefaultVariant(options).toMessage(options)
            : this.toActionVariant().toMessage(options);
    }

    async use(options?: Partial<ActionUseOptions>): Promise<unknown> {
        return this.getDefaultVariant(options).use(options);
    }

    protected abstract toActionVariant(data?: TData): TAction;
}

export { BaseAction, BaseActionVariant };
export type { BaseActionData, BaseActionVariantData };
