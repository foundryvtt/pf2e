import type { EffectSource } from "./data.ts";

/** Create the source data for a gag Disintegrate spell effect */
const createDisintegrateEffect = (): PreCreate<EffectSource> => {
    const rule = {
        key: "TokenImage",
        value: `systems/${SYSTEM_ID}/icons/effects/fine-powder.svg`,
        animation: { transition: fc.rendering.filters.TextureTransitionFilter.TYPES.DOTS },
    };
    return {
        _id: null,
        type: "effect",
        name: _loc("PF2E.Item.Effect.Disintegrated.Name"),
        img: `systems/${SYSTEM_ID}/icons/effects/fine-powder.svg`,
        system: {
            slug: "effect-fine-powder",
            description: { value: _loc("PF2E.Item.Effect.Disintegrated.Description") },
            rules: [rule],
            tokenIcon: { show: false },
        },
    };
};

export { createDisintegrateEffect };
