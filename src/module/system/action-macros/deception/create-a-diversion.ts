import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.CreateADiversion";
const CREATE_A_DIVERSION_VARIANTS = ["distracting-words", "gesture", "trick"] as const;
type CreateADiversionVariant = (typeof CREATE_A_DIVERSION_VARIANTS)[number];

export function createADiversion(options: { variant: CreateADiversionVariant } & SkillActionOptions): void {
    const { title, traits, variant } = (() => {
        switch (options?.variant) {
            case "distracting-words":
                return {
                    title: `${PREFIX}.DistractingWords.Title`,
                    traits: ["auditory", "linguistic", "mental"],
                    variant: options.variant,
                };
            case "gesture":
                return {
                    title: `${PREFIX}.Gesture.Title`,
                    traits: ["manipulate", "mental"],
                    variant: options.variant,
                };
            case "trick":
                return {
                    title: `${PREFIX}.Trick.Title`,
                    traits: ["manipulate", "mental"],
                    variant: options.variant,
                };
            default: {
                const variant = options?.variant ? `'${options.variant}'` : "null";
                const variants = CREATE_A_DIVERSION_VARIANTS.map((v) => `'${v}'`).join(", ");
                ui.notifications.error(game.i18n.format(`${PREFIX}.Warning.UnknownVariant`, { variant, variants }));
                throw new Error(`Unknown variant ${variant} for Create a Diversion, use one of ${variants}.`);
            }
        }
    })();
    const slug = options?.skill ?? "deception";
    const rollOptions = ["action:create-a-diversion", `action:create-a-diversion:${variant}`];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.failure`, ["failure", "criticalFailure"]),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
