import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { Statistic } from "@system/statistic/index.ts";
import { SingleCheckAction, SingleCheckActionVariant, SingleCheckActionVariantData } from "@actor/actions/index.ts";
import { CreaturePF2e } from "@module/actor/index.ts";

const PREFIX = "PF2E.Actions.AdministerFirstAid";

const ADMINISTER_FIRST_AID_VARIANTS = ["stabilize", "stop-bleeding"] as const;
type AdministerFirstAidVariant = (typeof ADMINISTER_FIRST_AID_VARIANTS)[number];

function stabilizeDifficultyClass(target: CreaturePF2e) {
    const { dying } = target.attributes;
    if (dying?.value) {
        const dc = 5 + dying.recoveryDC + dying.value;
        return new Statistic(target, {
            slug: "administer-first-aid",
            label: `${PREFIX}.Stabilize.Title`,
            dc: { base: dc, label: `${PREFIX}.Stabilize.DifficultyClass.Label` },
        });
    }
    throw new Error(game.i18n.localize(`${PREFIX}.Warning.TargetNotDying`));
}

function administerFirstAid(options: { variant: AdministerFirstAidVariant } & SkillActionOptions): void {
    const { notes, title, variant } = (() => {
        const mainTitle = game.i18n.localize(`${PREFIX}.Title`);
        switch (options?.variant) {
            case "stabilize":
                return {
                    notes: {
                        criticalFailure: `${PREFIX}.Stabilize.Notes.criticalFailure`,
                        success: `${PREFIX}.Stabilize.Notes.success`,
                    },
                    title: mainTitle + " - " + game.i18n.localize(`${PREFIX}.Stabilize.Title`),
                    variant: options.variant,
                };
            case "stop-bleeding":
                return {
                    notes: {
                        criticalFailure: `${PREFIX}.StopBleeding.Notes.criticalFailure`,
                        success: `${PREFIX}.StopBleeding.Notes.success`,
                    },
                    title: mainTitle + " - " + game.i18n.localize(`${PREFIX}.StopBleeding.Title`),
                    variant: options.variant,
                };
            default: {
                const variant = options?.variant ? `'${options.variant}'` : "null";
                const variants = ADMINISTER_FIRST_AID_VARIANTS.map((v) => `'${v}'`).join(", ");
                const error = `${PREFIX}.Warning.UnknownVariant`;
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
                try {
                    return stabilizeDifficultyClass(target);
                } catch (error) {
                    if (error instanceof Error) {
                        ui.notifications.warn(error.message);
                    } else {
                        throw error;
                    }
                }
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

class StabilizeActionVariant extends SingleCheckActionVariant {
    protected override difficultyClassWithTarget(target: CreaturePF2e): Statistic | null {
        return stabilizeDifficultyClass(target);
    }
}

class AdministerFirstAidAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 2,
            description: `${PREFIX}.Description`,
            name: `${PREFIX}.Title`,
            slug: "administer-first-aid",
            statistic: "medicine",
            traits: ["manipulate"],
            variants: [
                {
                    description: `${PREFIX}.Stabilize.Description`,
                    name: `${PREFIX}.Stabilize.Title`,
                    notes: [
                        { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Stabilize.Notes.success` },
                        { outcome: ["criticalFailure"], text: `${PREFIX}.Stabilize.Notes.criticalFailure` },
                    ],
                    slug: "stabilize",
                },
                {
                    description: `${PREFIX}.StopBleeding.Description`,
                    name: `${PREFIX}.StopBleeding.Title`,
                    notes: [
                        { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.StopBleeding.Notes.success` },
                        { outcome: ["criticalFailure"], text: `${PREFIX}.StopBleeding.Notes.criticalFailure` },
                    ],
                    slug: "stop-bleeding",
                },
            ],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        if (data?.slug === "stabilize") {
            return new StabilizeActionVariant(this, data);
        }
        return super.toActionVariant(data);
    }
}

const action = new AdministerFirstAidAction();

export { administerFirstAid as legacy, action };
