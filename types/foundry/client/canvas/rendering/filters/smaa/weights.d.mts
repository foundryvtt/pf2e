import { SMAAFilterConfig } from "./smaa.mjs";

/**
 * The blending weight calculation filter for {@link foundry.canvas.rendering.filters.SMAAFilter}.
 */
export default class SMAABWeightCalculationFilter extends PIXI.Filter {
    /**
     * @param {SMAAFilterConfig} config
     */
    constructor(config: SMAAFilterConfig);
}
