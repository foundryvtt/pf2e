import type { ApplicationConfiguration, ApplicationRenderOptions } from "../_types.mjs";
import type ApplicationV2 from "../api/application.mjs";

/**
 * The Game Paused banner.
 */
export default class GamePause extends ApplicationV2 {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    protected override _prepareContext(): Promise<object>;

    protected override _renderHTML(
        context: object,
        options: ApplicationRenderOptions,
    ): Promise<[HTMLImageElement, HTMLElement]>;

    protected override _replaceHTML(result: HTMLElement[], content: HTMLElement): void;
}
