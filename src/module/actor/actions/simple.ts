import { ActionCost, ActionUseOptions } from "./types.ts";
import { ActorPF2e } from "@actor";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";
import { BaseAction, BaseActionData, BaseActionVariant, BaseActionVariantData } from "./base.ts";
import { EffectPF2e } from "@item";

interface SimpleActionVariantData extends BaseActionVariantData {
    effect?: string | EffectPF2e;
}

interface SimpleActionData extends BaseActionData<SimpleActionVariantData> {
    effect?: string | EffectPF2e;
}

interface SimpleActionUseOptions extends ActionUseOptions {
    cost: ActionCost;
    effect: string | EffectPF2e | false;
}

interface SimpleActionResult {
    actor: ActorPF2e;
    effect?: EffectPF2e;
    message?: ChatMessage;
}

async function toEffectItem(effect?: string | EffectPF2e) {
    return typeof effect === "string" ? await fromUuid(effect) : effect;
}

class SimpleActionVariant extends BaseActionVariant {
    readonly #action: SimpleAction;
    readonly #effect?: string | EffectPF2e;

    constructor(action: SimpleAction, data?: SimpleActionVariantData) {
        super(action, data);
        this.#action = action;
        this.#effect = data?.effect ?? action.effect;
    }

    get effect(): string | EffectPF2e | undefined {
        return this.#effect ?? this.#action.effect;
    }

    override async use(options: Partial<SimpleActionUseOptions> = {}): Promise<SimpleActionResult[]> {
        const actors: ActorPF2e[] = [];
        if (Array.isArray(options.actors)) {
            actors.push(...options.actors);
        } else if (options.actors) {
            actors.push(options.actors);
        } else {
            actors.push(...getSelectedOrOwnActors());
        }
        if (actors.length === 0) {
            throw new Error(game.i18n.localize("PF2E.ActionsWarning.NoActor"));
        }

        const traitLabels: Record<string, string | undefined> = CONFIG.PF2E.actionTraits;
        const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
        const traits = this.traits.concat(options.traits ?? []).map((trait) => ({
            description: traitDescriptions[trait],
            label: traitLabels[trait] ?? trait,
            slug: trait,
        }));
        const effect = options?.effect === false ? undefined : await toEffectItem(options?.effect ?? this.effect);
        const name = this.name
            ? `${game.i18n.localize(this.#action.name)} - ${game.i18n.localize(this.name)}`
            : game.i18n.localize(this.#action.name);
        const flavor = await renderTemplate("systems/pf2e/templates/actors/actions/simple/chat-message-flavor.hbs", {
            effect,
            glyph: this.glyph,
            name,
            traits,
        });
        const results: SimpleActionResult[] = [];
        for (const actor of actors) {
            const message = await ChatMessage.create({
                flavor,
                speaker: ChatMessage.getSpeaker({ actor }),
            });
            const item =
                effect && actor.isOwner
                    ? ((await actor.createEmbeddedDocuments("Item", [effect.toObject()]))[0] as EffectPF2e)
                    : undefined;
            results.push({ actor, effect: item, message });
        }
        return results;
    }
}

class SimpleAction extends BaseAction<SimpleActionVariantData, SimpleActionVariant> {
    readonly effect?: string | EffectPF2e;

    public constructor(data: SimpleActionData) {
        super(data);
        this.effect = data.effect;
    }

    protected override toActionVariant(data?: SimpleActionVariantData): SimpleActionVariant {
        return new SimpleActionVariant(this, data);
    }
}

export { SimpleAction, SimpleActionResult, SimpleActionVariant, SimpleActionVariantData, SimpleActionUseOptions };
