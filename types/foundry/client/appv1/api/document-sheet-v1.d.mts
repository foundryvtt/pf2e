import ProseMirrorEditor, { EditorCreateOptions } from "@client/applications/ux/prosemirror-editor.mjs";
import User from "@client/documents/user.mjs";
import Document from "@common/abstract/document.mjs";
import HTMLSecret from "../../applications/html-secret.mjs";
import { AppV1RenderOptions, ApplicationV1HeaderButton } from "./application-v1.mjs";
import FormApplication, { FormApplicationOptions } from "./form-application-v1.mjs";

export interface DocumentSheetV1Options extends FormApplicationOptions {
    /** The default permissions required to view this Document sheet. */
    viewPermission: number;
    /** An array of {@link HTMLSecret} configuration objects. */
    sheetConfig: boolean;
    // undocumented
    cssClass: string;
}

/**
 * Extend the FormApplication pattern to incorporate specific logic for viewing or editing Document instances.
 * See the FormApplication documentation for more complete description of this interface.
 * @deprecated since v13
 */
export default class DocumentSheet<
    TDocument extends Document = Document,
    TOptions extends DocumentSheetV1Options = DocumentSheetV1Options,
> extends FormApplication<TDocument, TOptions> {
    constructor(object: TDocument, options?: Partial<TOptions>);

    static override get defaultOptions(): DocumentSheetV1Options;

    /** A convenience accessor for the object property of the inherited FormApplication instance */
    get document(): TDocument;

    override get id(): string;

    override get isEditable(): boolean;

    override get title(): string;

    override close(options?: { force?: boolean | undefined }): Promise<void>;

    override getData(options?: Partial<TOptions>): DocumentSheetData<TDocument> | Promise<DocumentSheetData<TDocument>>;

    protected override _activateCoreListeners(html: JQuery): void;

    override activateEditor(
        name: string,
        options?: EditorCreateOptions,
        initialContent?: string,
    ): Promise<TinyMCE.Editor | ProseMirrorEditor>;

    override render(force?: boolean, options?: AppV1RenderOptions): this;

    protected override _renderOuter(options: AppV1RenderOptions): Promise<JQuery>;

    /** Create an ID link button in the document sheet header which displays the document ID and copies to clipboard */
    protected _createDocumentIdLink(html: JQuery): void;

    /**
     * Test whether a certain User has permission to view this Document Sheet.
     * @param user The user requesting to render the sheet
     * @returns Does the User have permission to view this sheet?
     */
    protected _canUserView(user: User): boolean;

    /** Create objects for managing the functionality of secret blocks within this Document's content. */
    protected _createSecretHandlers(): HTMLSecret[];

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _getHeaderButtons(): ApplicationV1HeaderButton[];

    /**
     * Get the HTML content that a given secret block is embedded in.
     * @param secret The secret block.
     */
    protected _getSecretContent(secret: HTMLElement): string;

    /**
     * Update the HTML content that a given secret block is embedded in.
     * @param secret  The secret block.
     * @param content The new content.
     * @returns The updated Document.
     */
    protected _updateSecret(secret: HTMLElement, content: string): Promise<TDocument>;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}

export interface DocumentSheetData<TDocument extends foundry.abstract.Document = foundry.abstract.Document> {
    cssClass: string;
    editable: boolean;
    document: TDocument;
    data: object;
    limited: boolean;
    options: Partial<DocumentSheetV1Options>;
    owner: boolean;
    title: string;
}
