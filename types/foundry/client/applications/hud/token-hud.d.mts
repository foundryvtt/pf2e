import { Token } from "@client/canvas/placeables/_module.mjs";
import Actor from "@client/documents/actor.mjs";
import { ImageFilePath } from "@common/constants.mjs";
import type { ApplicationConfiguration, ApplicationPosition } from "../_types.mjs";
import type HandlebarsApplicationMixin from "../api/handlebars-application.mjs";
import type { HandlebarsRenderOptions, HandlebarsTemplatePart } from "../api/handlebars-application.mjs";
import FormDataExtended from "../ux/form-data-extended.mjs";
import type BasePlaceableHUD from "./placeable-hud.mjs";
import type { PlaceableHUDContext } from "./placeable-hud.mjs";

/**
 * An implementation of the BasePlaceableHUD base class which renders a heads-up-display interface for Token objects.
 * This interface provides controls for visibility, attribute bars, elevation, status effects, and more.
 * The TokenHUD implementation can be configured and replaced via CONFIG.Token.hudClass.
 */
export default class TokenHUD extends HandlebarsApplicationMixin(BasePlaceableHUD) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /** Convenience reference to the Actor modified by this TokenHUD. */
    get actor(): Actor | undefined;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<PlaceableHUDContext>;

    /** Get an array of icon paths which represent valid status effect choices. */
    protected _getStatusEffectChoices(): Record<string, TokenHUDStatusEffect>;

    protected override _updatePosition(position: ApplicationPosition): ApplicationPosition;

    protected override _onPosition(position: ApplicationPosition): void;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    override bind(object: Token): Promise<void>;

    /**
     * Toggle the expanded state of the status effects selection tray.
     * @param [active] Force the status tray to be active or inactive
     */
    toggleStatusTray(active?: boolean): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _parseAttributeInput(
        name: string,
        attr: object | number,
        input: string,
    ): { value: number; delta?: number; isDelta: boolean; isBar: boolean };

    protected override _onSubmit(event: SubmitEvent, form: HTMLFormElement, formData: FormDataExtended): Promise<void>;
}

export interface TokenHUDStatusEffect {
    id: string;
    _id: string;
    title: string;
    src: ImageFilePath;
    isActive: boolean;
    isOverlay: boolean;
}
