import { EffectSource } from "./data.ts";

/** Create the source data for a gag Disintegrate spell effect */
const createDisintegrateEffect = (): PreCreate<EffectSource> => {
    const rule = {
        key: "TokenImage",
        value: "systems/pf2e/icons/effects/fine-powder.svg",
        animation: { transition: TextureTransitionFilter.TYPES.DOTS },
    };
    return {
        _id: null,
        type: "effect",
        name: game.i18n.localize("PF2E.Item.Effect.Disintegrated.Name"),
        img: "systems/pf2e/icons/effects/fine-powder.svg",
        system: {
            slug: "effect-fine-powder",
            description: { value: game.i18n.localize("PF2E.Item.Effect.Disintegrated.Description") },
            rules: [rule],
            tokenIcon: { show: false },
        },
    };
};

export { createDisintegrateEffect };
