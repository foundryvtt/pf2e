import type { ApplicationConfiguration, ApplicationRenderOptions } from "../_types.d.ts";
import type ApplicationV2 from "../api/application.d.ts";

/** An abstract base class for displaying a heads-up-display interface bound to a Placeable Object on the Canvas. */
export default abstract class BasePlaceableHUD extends ApplicationV2<
    ApplicationConfiguration,
    ApplicationRenderOptions,
    PlaceableHUDContext
> {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override BASE_APPLICATION: typeof BasePlaceableHUD;

    /** Reference a PlaceableObject this HUD is currently bound to. */
    get object(): PlaceableObject;

    /** Convenience access to the Document which this HUD modifies. */
    get document(): CanvasDocument;

    /** Convenience access for the canvas layer which this HUD modifies */
    get layer(): PlaceablesLayer;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _prepareContext(options: ApplicationRenderOptions): Promise<PlaceableHUDContext>;

    protected override _updatePosition(position: ApplicationPosition): ApplicationPosition;

    protected override _onRender(context: object, options: ApplicationRenderOptions): Promise<void>;

    protected override _preClose(options: ApplicationRenderOptions): Promise<void>;

    /**
     * Insert the application HTML element into the DOM.
     * Subclasses may override this method to customize how the application is inserted.
     * @param element The element to insert
     */
    protected _insertElement(element: HTMLElement): void;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Bind the HUD to a new PlaceableObject and display it.
     * @param object A PlaceableObject instance to which the HUD should be bound
     */
    bind(object: PlaceableObject): Promise<void>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Handle submission of the BasePlaceableHUD form. */
    protected _onSubmit(event: SubmitEvent, form: HTMLFormElement, formData: FormDataExtended): Promise<void>;

    /**
     * Parse an attribute bar input string into a new value for the attribute field.
     * @param name  The name of the attribute
     * @param attr  The current value of the attribute
     * @param input The raw string input value
     * @returns The parsed input value
     */
    protected _parseAttributeInput(
        name: string,
        attr: object | number,
        input: string,
    ): { value: number; delta?: number; isDelta: boolean; isBar: boolean };
}

export interface PlaceableHUDContext {
    _id: string;
    id: string;
}
