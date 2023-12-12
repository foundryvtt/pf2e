import { EffectSource } from "./data.ts";

const createFinePowderEffect = (): PreCreate<EffectSource> => {
    return {
        _id: null,
        type: "effect",
        name: game.i18n.localize("PF2E.Item.Effect.FinePowder.Name"),
        img: "systems/pf2e/icons/effects/fine-powder.svg",
        system: {
            slug: "effect-fine-powder",
            description: { value: game.i18n.localize("PF2E.Item.Effect.FinePowder.Description") },
            rules: [{ key: "TokenImage", value: "systems/pf2e/icons/effects/fine-powder.svg" }],
            tokenIcon: { show: false },
        },
    };
};

export { createFinePowderEffect };
