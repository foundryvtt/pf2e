import { ActorPF2e } from "@actor";
import { SingleCheckAction, SingleCheckActionVariant, SingleCheckActionVariantData } from "@actor/actions/index.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import { CheckContextData, CheckContextOptions, CheckMacroContext } from "@system/action-macros/types.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.Grapple";

function grappleCheckContext<ItemType extends ItemPF2e<ActorPF2e>>(
    opts: CheckContextOptions<ItemType>,
    data: CheckContextData<ItemType>,
): CheckMacroContext<ItemType> | undefined {
    // weapon
    const weapon = ActionMacroHelpers.getBestEquippedItemForAction(opts.actor, ["grapple"], data.slug);

    // modifier
    const modifiers = data.modifiers?.length ? [...data.modifiers] : [];
    if (weapon && weapon.traits.has("grapple")) {
        const modifier = ActionMacroHelpers.getWeaponPotencyModifier(weapon, data.slug);
        if (modifier) {
            modifiers.push(modifier);
        }
    }

    return ActionMacroHelpers.defaultCheckContext(opts, { ...data, modifiers });
}

function grapple(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:grapple"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>>({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => grappleCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "fortitude",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, PREFIX, "criticalSuccess"),
            ActionMacroHelpers.note(selector, PREFIX, "success"),
            ActionMacroHelpers.note(selector, PREFIX, "failure"),
            ActionMacroHelpers.note(selector, PREFIX, "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class GrappleActionVariant extends SingleCheckActionVariant {
    protected override checkContext<ItemType extends ItemPF2e<ActorPF2e>>(
        opts: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>,
    ): CheckMacroContext<ItemType> | undefined {
        return grappleCheckContext(opts, data);
    }
}

class GrappleAction extends SingleCheckAction {
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
                { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
            ],
            section: "skill",
            slug: "grapple",
            statistic: "athletics",
            traits: ["attack"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): GrappleActionVariant {
        return new GrappleActionVariant(this, data);
    }
}

const action = new GrappleAction();

export { action, grapple as legacy };
