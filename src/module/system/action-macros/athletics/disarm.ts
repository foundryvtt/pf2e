import { ActorPF2e } from "@actor";
import { SingleCheckAction, SingleCheckActionVariant, SingleCheckActionVariantData } from "@actor/actions/index.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import { CheckContextData, CheckContextOptions, CheckMacroContext } from "@system/action-macros/types.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.Disarm";

function disarmCheckContext<ItemType extends ItemPF2e<ActorPF2e>>(
    opts: CheckContextOptions<ItemType>,
    data: CheckContextData<ItemType>,
): CheckMacroContext<ItemType> | undefined {
    // weapon
    const weapon = ActionMacroHelpers.getBestEquippedItemForAction(opts.actor, ["disarm"], data.slug);

    // modifiers
    const modifiers = data.modifiers?.length ? [...data.modifiers] : [];
    if (weapon && weapon.slug !== "basic-unarmed") {
        const modifier = ActionMacroHelpers.getWeaponPotencyModifier(weapon, data.slug);
        if (modifier) {
            modifiers.push(modifier);
        }
    }

    return ActionMacroHelpers.defaultCheckContext(opts, { ...data, modifiers });
}

function disarm(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:disarm"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>>({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => disarmCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "reflex",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Disarm", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Disarm", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Disarm", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class DisarmActionVariant extends SingleCheckActionVariant {
    protected override checkContext<ItemType extends ItemPF2e<ActorPF2e>>(
        opts: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>,
    ): CheckMacroContext<ItemType> | undefined {
        return disarmCheckContext(opts, data);
    }
}

class DisarmAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: `${PREFIX}.Description`,
            difficultyClass: "reflex",
            img: "icons/skills/melee/unarmed-punch-fist-white.webp",
            name: `${PREFIX}.Title`,
            notes: [
                { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
                { outcome: ["success"], text: `${PREFIX}.Notes.success` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
            ],
            section: "skill",
            slug: "disarm",
            statistic: "athletics",
            traits: ["attack"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): DisarmActionVariant {
        return new DisarmActionVariant(this, data);
    }
}

const action = new DisarmAction();

export { action, disarm as legacy };
