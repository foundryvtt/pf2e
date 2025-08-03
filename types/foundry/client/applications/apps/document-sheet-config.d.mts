import { Application } from "@client/appv1/api/_module.mjs";
import { ClientDocument } from "@client/documents/abstract/client-document.mjs";
import { DataField } from "@common/data/fields.mjs";
import { ApplicationFormConfiguration, ApplicationRenderContext } from "../_types.mjs";
import { HandlebarsApplicationMixin, HandlebarsRenderOptions, HandlebarsTemplatePart } from "../api/_module.mjs";
import ApplicationV2 from "../api/application.mjs";
import DocumentSheetV2, { DocumentSheetConfiguration } from "../api/document-sheet.mjs";

export interface DefaultSheetDescriptor {
    /** The identifier of the default sheet. */
    sheet: string;
    /** The default theme. */
    theme: string;
}

export interface SheetRegistrationDescriptor {
    /** The Document class to register a new sheet option for. */
    documentClass: typeof ClientDocument;
    /** The identifier of the sheet being registered. */
    id: string;
    /** A human-readable label for the sheet name, or a function that returns one. Will be localized. */
    label?: string | (() => string);
    /** An array of Document sub-types to register the sheet for. */
    types?: string[];
    /** An object of theme keys to labels that the sheet supports. If this option is not supplied, the sheet
     *  is assumed to support both light and dark themes. If null is supplied, it indicates that the sheet
     *  does not support theming. */
    themes?: Record<string, string> | null;
    /** Whether to make this sheet the default for the provided sub-types. Default: `false` */
    makeDefault?: boolean;
    /** Whether this sheet is available to be selected as a default sheet for all Documents of that type. Default: `true` */
    canBeDefault?: boolean;
    /** Whether this sheet appears in the sheet configuration UI for users. Default: `true` */
    canConfigure?: boolean;
}

export type SheetRegistrationOptions = Omit<SheetRegistrationDescriptor, "documentClass" | "id" | "sheetClass">;

export interface DocumentSheetConfigRenderContext {
    /** Context for the sheet field. */
    sheet: DocumentSheetConfigFieldDescriptor;
    /** Context for the theme field. */
    theme: DocumentSheetConfigFieldDescriptor;
}

export interface DocumentSheetConfigFieldDescriptor {
    /** The field instance. */
    field: DataField;
    /** The field's form name. */
    name: string;
    /** The field's value. */
    value: string;
    /** Whether the field should be disabled in the form. */
    disabled?: boolean;
}

/** An Application for configuring Document sheet settings. */
export default class DocumentSheetConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    override _preparePartContext(partId: string, context: object, options: HandlebarsRenderOptions): Promise<object>;

    /** Prepare render context for the footer part. */
    protected _prepareFooterContext(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    /** Prepare render context for the form part. */
    protected _prepareFormContext(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    override _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void;

    /* -------------------------------------------- */
    /*  Helpers                                     */
    /* -------------------------------------------- */

    /**
     * Marshal information on the available sheet classes for a given document type and sub-type, and format it for
     * display.
     * @param documentName  The Document type.
     * @param [subType]     The Document sub-type, if applicable.
     */
    static getSheetClassesForSubType(
        documentName: string,
        subType?: string,
    ): { sheetClasses: Record<string, string>; defaultClasses: Record<string, string>; defaultClass: string };

    /**
     * Retrieve the user's theme preference for the given Document.
     * @param document  The Document.
     * @returns         The theme identifier, or a blank string if the user has no preference.
     */
    static getSheetThemeForDocument(document: ClientDocument): string;

    /* -------------------------------------------- */
    /*  Sheet Configuration API                     */
    /* -------------------------------------------- */

    /** Initialize the configured sheet preferences for Documents which support dynamic sheet assignment. */
    static initializeSheets(): Promise<void>;

    /**
     * Register a sheet class as a candidate to be used to display Documents of a given type.
     * @param documentClass  The Document class to register a new sheet for.
     * @param scope          A unique namespace scope for this sheet.
     * @param sheetClass     An Application class used to render the sheet.
     * @param options        Sheet registration configuration options.
     */
    static registerSheet(
        documentClass: ConstructorOf<ClientDocument>,
        scope: string,
        sheetClass: AbstractConstructorOf<Application> | AbstractConstructorOf<ApplicationV2>,
        options?: SheetRegistrationOptions,
    ): void;

    /**
     * Unregister a sheet class, removing it from the list of available Applications to use for a Document type.
     * @param documentClass    The Document class to register a new sheet option for.
     * @param scope            A unique namespace scope for this sheet.
     * @param sheetClass       An Application class used to render the sheet.
     * @param [options]
     * @param options.types  The sub-types this sheet should be removed for, otherwise all sub-types are unregistered.
     */
    static unregisterSheet(
        documentClass: ConstructorOf<ClientDocument>,
        scope: string,
        sheetClass: ConstructorOf<Application> | ConstructorOf<ApplicationV2>,
        options?: { types: string[] },
    ): void;

    /**
     * Update the current default sheets using a new core World setting.
     * @param setting  The stored default sheet settings.
     */
    static updateDefaultSheets(setting: Record<string, Record<string, string>>): void;
}
