import { ActorPF2e } from "@actor";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { WeaponPF2e } from "@item";
import {
    CheckContext,
    CheckContextData,
    CheckContextOptions,
    CheckResultCallback,
    CombatManeuverActionUseOptions,
} from "@system/action-macros/types.ts";
import {
    SingleCheckAction,
    SingleCheckActionUseOptions,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
} from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Disarm";

type DisarmActionUseOptions = SingleCheckActionUseOptions & CombatManeuverActionUseOptions;

function disarmCheckContext(
    opts: CheckContextOptions<Partial<CombatManeuverActionUseOptions>>,
    data: CheckContextData,
): CheckContext | undefined {
    // weapon
    const item = ActionMacroHelpers.resolveWieldedWeapon(opts.actor, opts.passthrough?.item, "disarm");

    // modifiers
    const modifiers = data.modifiers?.length ? [...data.modifiers] : [];
    if (item && item.slug !== "basic-unarmed") {
        const modifier = ActionMacroHelpers.getWeaponPotencyModifier(item, data.slug);
        if (modifier) {
            modifiers.push(modifier);
        }
    }

    return ActionMacroHelpers.defaultCheckContext(opts, { ...data, item, modifiers });
}

function disarm(options: SkillActionOptions & Partial<CombatManeuverActionUseOptions>): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:disarm"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>, Partial<CombatManeuverActionUseOptions>>({
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
        passthrough: options,
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class DisarmActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<DisarmActionUseOptions> = {}): Promise<CheckResultCallback[]> {
        return super.use(options);
    }

    protected override checkContext(
        opts: CheckContextOptions<Partial<DisarmActionUseOptions>>,
        data: CheckContextData,
    ): CheckContext | undefined {
        return disarmCheckContext(opts, data);
    }
}

class DisarmAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: `${PREFIX}.Description`,
            difficultyClass: "reflex",
            name: `${PREFIX}.Title`,
            notes: [
                { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
                { outcome: ["success"], text: `${PREFIX}.Notes.success` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
            ],
            rollOptions: ["action:disarm"],
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

export { disarm as legacy, action };
