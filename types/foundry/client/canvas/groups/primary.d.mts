import Collection from "@common/utils/collection.mjs";
import { CachedContainer } from "../containers/_module.mjs";
import PrimarySpriteMesh from "../primary/primary-sprite-mesh.mjs";

/**
 * The primary Canvas group which generally contains tangible physical objects which exist within the Scene.
 * This group is a {@link CachedContainer} which is rendered to the Scene as a {@link SpriteMesh}.
 * This allows the rendered result of the Primary Canvas Group to be affected by a {@link BaseSamplerShader}.
 * @category - Canvas
 * @todo Fill in
 */
declare class PrimaryCanvasGroup extends CachedContainer {
    tokens: Collection<string, PrimarySpriteMesh>;

    /**
     * Render all tokens in their own render texture.
     * @param renderer The renderer to use.
     */
    protected _renderTokens(renderer: PIXI.Renderer): void;
}

declare interface PrimaryCanvasGroup extends CachedContainer {
    readonly children: PIXI.Container[];
}
