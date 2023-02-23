import { ActionMacroHelpers, SkillActionOptions } from "..";
import { Statistic } from "@system/statistic";

const ADMINISTER_FIRST_AID_VARIANTS = {
    stabilize: {
        notes: {
            criticalFailure: "PF2E.Actions.AdministerFirstAid.Stabilize.Notes.criticalFailure",
            success: "PF2E.Actions.AdministerFirstAid.Stabilize.Notes.success",
        },
        rollOption: "action:administer-first-aid:stabilize",
        title: "PF2E.Actions.AdministerFirstAid.Stabilize.Title",
    },
    stopBleeding: {
        notes: {
            criticalFailure: "PF2E.Actions.AdministerFirstAid.StopBleeding.Notes.criticalFailure",
            success: "PF2E.Actions.AdministerFirstAid.StopBleeding.Notes.success",
        },
        rollOption: "action:administer-first-aid:stop-bleeding",
        title: "PF2E.Actions.AdministerFirstAid.StopBleeding.Title",
    },
} as const;
type AdministerFirstAidVariant = keyof typeof ADMINISTER_FIRST_AID_VARIANTS;

export function administerFirstAid(options: { variant: AdministerFirstAidVariant } & SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "medicine");
    const variant = ADMINISTER_FIRST_AID_VARIANTS[options.variant];
    if (!variant) {
        const data = { variant: options.variant };
        const warning = "PF2E.Actions.AdministerFirstAid.Warning.UnknownVariant";
        ui.notifications.warn(game.i18n.format(warning, data));
        return;
    }
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "D",
        title: variant.title,
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:administer-first-aid", variant.rollOption],
        extraOptions: ["action:administer-first-aid", variant.rollOption],
        traits: ["manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => {
            if (options.variant === "stabilize" && target) {
                const { dying } = target.attributes;
                if (dying?.value) {
                    const dc = 5 + dying.recoveryDC + dying.value;
                    return new Statistic(target, {
                        slug: "administer-first-aid",
                        label: "PF2E.Actions.AdministerFirstAid.Stabilize.Title",
                        dc: { base: dc, label: "PF2E.Actions.AdministerFirstAid.Stabilize.DifficultyClass.Label" },
                    });
                }
                ui.notifications.warn(game.i18n.localize("PF2E.Actions.AdministerFirstAid.Warning.TargetNotDying"));
            }
            return null;
        },
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, variant.notes.success, ["success", "criticalSuccess"]),
            ActionMacroHelpers.outcomesNote(selector, variant.notes.criticalFailure, ["criticalFailure"]),
        ],
    });
}
