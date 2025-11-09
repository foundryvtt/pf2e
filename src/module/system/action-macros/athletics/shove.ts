import { ActorPF2e } from "@actor";
import { SingleCheckAction, SingleCheckActionVariant, SingleCheckActionVariantData } from "@actor/actions/index.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import { CheckContextData, CheckContextOptions, CheckMacroContext } from "@system/action-macros/types.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.Shove";

function shoveCheckContext<ItemType extends ItemPF2e<ActorPF2e>>(
    opts: CheckContextOptions<ItemType>,
    data: CheckContextData<ItemType>,
): CheckMacroContext<ItemType> | undefined {
    // weapon
    const weapon = ActionMacroHelpers.getBestEquippedItemForAction(opts.actor, ["shove"], data.slug);

    // modifiers
    const modifiers = data.modifiers?.length ? [...data.modifiers] : [];
    if (weapon && weapon.traits.has("shove")) {
        const modifier = ActionMacroHelpers.getWeaponPotencyModifier(weapon, data.slug);
        if (modifier) {
            modifiers.push(modifier);
        }
    }

    return ActionMacroHelpers.defaultCheckContext(opts, { ...data, modifiers });
}

function shove(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:shove", "forced-movement"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>>({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => shoveCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "fortitude",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, PREFIX, "criticalSuccess"),
            ActionMacroHelpers.note(selector, PREFIX, "success"),
            ActionMacroHelpers.note(selector, PREFIX, "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class ShoveActionVariant extends SingleCheckActionVariant {
    protected override checkContext<ItemType extends ItemPF2e<ActorPF2e>>(
        opts: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>,
    ): CheckMacroContext<ItemType> | undefined {
        return shoveCheckContext(opts, data);
    }
}

class ShoveAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: `${PREFIX}.Description`,
            difficultyClass: "fortitude",
            img: "icons/skills/melee/unarmed-punch-fist-white.webp",
            name: `${PREFIX}.Title`,
            notes: [
                { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
                { outcome: ["success"], text: `${PREFIX}.Notes.success` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
            ],
            rollOptions: ["forced-movement"],
            section: "skill",
            slug: "shove",
            statistic: "athletics",
            traits: ["attack"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): ShoveActionVariant {
        return new ShoveActionVariant(this, data);
    }
}

const action = new ShoveAction();

export { action, shove as legacy };
