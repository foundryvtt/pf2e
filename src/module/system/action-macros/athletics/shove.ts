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

const PREFIX = "PF2E.Actions.Shove";

type ShoveActionUseOptions = SingleCheckActionUseOptions & CombatManeuverActionUseOptions;

function shoveCheckContext(
    opts: CheckContextOptions<Partial<CombatManeuverActionUseOptions>>,
    data: CheckContextData,
): CheckContext | undefined {
    // weapon
    const item = ActionMacroHelpers.resolveWieldedWeapon(opts.actor, opts.passthrough?.item, "shove");

    // modifiers
    const modifiers = data.modifiers?.length ? [...data.modifiers] : [];
    if (item) {
        const modifier = ActionMacroHelpers.getWeaponPotencyModifier(item, data.slug);
        if (modifier) {
            modifiers.push(modifier);
        }
    }

    return ActionMacroHelpers.defaultCheckContext(opts, { ...data, item, modifiers });
}

function shove(options: SkillActionOptions & Partial<CombatManeuverActionUseOptions>): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:shove"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>, Partial<CombatManeuverActionUseOptions>>({
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
        passthrough: options,
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class ShoveActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<ShoveActionUseOptions> = {}): Promise<CheckResultCallback[]> {
        return super.use(options);
    }

    protected override checkContext(
        opts: CheckContextOptions<Partial<ShoveActionUseOptions>>,
        data: CheckContextData,
    ): CheckContext | undefined {
        return shoveCheckContext(opts, data);
    }
}

class ShoveAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: `${PREFIX}.Description`,
            difficultyClass: "fortitude",
            name: `${PREFIX}.Title`,
            notes: [
                { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
                { outcome: ["success"], text: `${PREFIX}.Notes.success` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
            ],
            rollOptions: ["action:shove"],
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

export { shove as legacy, action };
