import { SMAAFilterConfig } from "./smaa.mjs";

/**
 * The edge detection filter for {@link foundry.canvas.rendering.filters.SMAAFilter}.
 */
export default class SMAAEdgeDetectionFilter extends PIXI.Filter {
    /**
     * @param {SMAAFilterConfig} config
     */
    constructor(config: SMAAFilterConfig);
}
