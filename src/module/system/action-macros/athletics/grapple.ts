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

const PREFIX = "PF2E.Actions.Grapple";

type GrappleActionUseOptions = SingleCheckActionUseOptions & CombatManeuverActionUseOptions;

function grappleCheckContext(
    opts: CheckContextOptions<Partial<CombatManeuverActionUseOptions>>,
    data: CheckContextData,
): CheckContext | undefined {
    // weapon
    const item = ActionMacroHelpers.resolveWieldedWeapon(opts.actor, opts.passthrough?.item, "grapple");

    // modifier
    const modifiers = data.modifiers?.length ? [...data.modifiers] : [];
    if (item) {
        const modifier = ActionMacroHelpers.getWeaponPotencyModifier(item, data.slug);
        if (modifier) {
            modifiers.push(modifier);
        }
    }

    return ActionMacroHelpers.defaultCheckContext(opts, { ...data, item, modifiers });
}

function grapple(options: SkillActionOptions & Partial<CombatManeuverActionUseOptions>): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:grapple"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>, Partial<CombatManeuverActionUseOptions>>({
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
        passthrough: options,
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class GrappleActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<GrappleActionUseOptions> = {}): Promise<CheckResultCallback[]> {
        return super.use(options);
    }

    protected override checkContext(
        opts: CheckContextOptions<Partial<GrappleActionUseOptions>>,
        data: CheckContextData,
    ): CheckContext | undefined {
        return grappleCheckContext(opts, data);
    }
}

class GrappleAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: `${PREFIX}.Description`,
            difficultyClass: "fortitude",
            name: `${PREFIX}.Title`,
            notes: [
                { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
                { outcome: ["success"], text: `${PREFIX}.Notes.success` },
                { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
            ],
            rollOptions: ["action:grapple"],
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

export { grapple as legacy, action };
