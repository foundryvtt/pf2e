import "../build/lib/foundry-utils.ts";
import { MockActor } from "./mocks/actor.ts";
import { MockItem } from "./mocks/item.ts";
import { MockToken } from "./mocks/token.ts";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.game = Object.freeze({
    settings: Object.freeze({
        get: (_module: string, settingKey: string) => {
            switch (settingKey) {
                /* Proficiency Modifiers */
                case "proficiencyUntrainedModifier":
                    return -2;
                case "proficiencyTrainedModifier":
                    return 2;
                case "proficiencyExpertModifier":
                    return 4;
                case "proficiencyMasterModifier":
                    return 6;
                case "proficiencyLegendaryModifier":
                    return 8;

                /* Variant rules */
                case "proficiencyVariant":
                    return false;
                case "automaticBonusVariant":
                    return "noABP";
                default:
                    throw new Error("Undefined setting.");
            }
        },
    }),
    pf2e: { settings: { variants: { pwol: false } } },
    user: {},
    i18n: {
        localize: (path: string) => path,
    },
});

Object.assign(globalThis, {
    SYSTEM_ID: "pf2e",
    Actor: MockActor,
    Item: MockItem,
    Token: MockToken,
    FormApplication: class {},
    Roll: class {},
    Application: class {},
    Hooks: class {
        static on(..._args: unknown[]) {}
    },
    _loc: game.i18n.localize,
});

Math.clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
