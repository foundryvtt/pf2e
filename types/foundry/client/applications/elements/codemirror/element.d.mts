import { Point } from "@common/_types.mjs";
import { CodeMirrorInputConfig, CodeMirrorLanguage } from "@common/data/_types.mjs";
import AbstractFormInputElement from "../form-element.mjs";

interface HTMLCodeMirrorOptions {
    /** The initial editor contents. */
    value?: string;
}

/**
 * A custom HTML element responsible for displaying a CodeMirror rich text editor.
 */
export default class HTMLCodeMirrorElement extends AbstractFormInputElement<string> {
    constructor(options?: HTMLCodeMirrorOptions);

    static override tagName: "code-mirror";

    static override observedAttributes: string[];

    /**
     * This element's language attribute or its default if no value is set
     */
    get language(): CodeMirrorLanguage;

    set language(value);

    /**
     * This element's indent attribute, which determines the number of spaces added upon pressing the TAB key. A value
     * of 0 disables this feature entirely.
     */
    get indent(): number;

    set indent(value);

    /**
     * The element's nowrap attribute, which if present disables line-wrapping
     */
    get nowrap(): boolean;

    set nowrap(value);

    protected override _toggleDisabled(disabled: boolean): void;

    protected override _getValue(): string;

    protected override _setValue(value: string): void;

    /**
     * Given screen co-ordinates, returns the position in the editor's text content at those co-ordinates.
     * @param coords The screen co-ordinates.
     */
    posAtCoords(coords: Point): number;

    /* -------------------------------------------- */
    /*  Element Lifecycle                           */
    /* -------------------------------------------- */

    override connectedCallback(): void;

    protected override _buildElements(): [HTMLElement];

    override attributeChangedCallback(attrName: string, oldValue: string, newValue: string): void;

    /**
     * Call for garbage collection upon this element being removed from the DOM.
     */
    disconnectedCallback(): void;

    /**
     * Create an HTMLCodeMirrorElement element for a StringField (typically a JSONField or JavascriptField).
     */
    static create(config: CodeMirrorInputConfig): HTMLCodeMirrorElement;
}
