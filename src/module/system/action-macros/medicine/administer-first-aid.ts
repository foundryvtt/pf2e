import { ActionMacroHelpers, SkillActionOptions } from "..";
import { Statistic } from "@system/statistic";

const ADMINISTER_FIRST_AID_VARIANTS = ["stabilize", "stop-bleeding"] as const;
type AdministerFirstAidVariant = (typeof ADMINISTER_FIRST_AID_VARIANTS)[number];

export function administerFirstAid(options: { variant: AdministerFirstAidVariant } & SkillActionOptions) {
    const { notes, title, variant } = (() => {
        switch (options?.variant) {
            case "stabilize":
                return {
                    notes: {
                        criticalFailure: "PF2E.Actions.AdministerFirstAid.Stabilize.Notes.criticalFailure",
                        success: "PF2E.Actions.AdministerFirstAid.Stabilize.Notes.success",
                    },
                    title: "PF2E.Actions.AdministerFirstAid.Stabilize.Title",
                    variant: options.variant,
                };
            case "stop-bleeding":
                return {
                    notes: {
                        criticalFailure: "PF2E.Actions.AdministerFirstAid.StopBleeding.Notes.criticalFailure",
                        success: "PF2E.Actions.AdministerFirstAid.StopBleeding.Notes.success",
                    },
                    title: "PF2E.Actions.AdministerFirstAid.StopBleeding.Title",
                    variant: options.variant,
                };
            default: {
                const variant = options?.variant ? `'${options.variant}'` : "null";
                const variants = ADMINISTER_FIRST_AID_VARIANTS.map((v) => `'${v}'`).join(", ");
                const error = "PF2E.Actions.AdministerFirstAid.Warning.UnknownVariant";
                ui.notifications.error(game.i18n.format(error, { variant, variants }));
                throw new Error(`Unknown variant ${variant} for Administer First Aid, use one of ${variants}.`);
            }
        }
    })();
    const slug = options?.skill ?? "medicine";
    const rollOptions = ["action:administer-first-aid", `action:administer-first-aid:${variant}`];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "D",
        title,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["manipulate"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => {
            if (variant === "stabilize" && target) {
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
            ActionMacroHelpers.outcomesNote(selector, notes.success, ["success", "criticalSuccess"]),
            ActionMacroHelpers.outcomesNote(selector, notes.criticalFailure, ["criticalFailure"]),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
