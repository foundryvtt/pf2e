import type { AbstractFormInputElement } from "./form-element.d.ts";

/**
 * A custom HTML element responsible displaying a ProseMirror rich text editor.
 */
export default class HTMLProseMirrorElement extends AbstractFormInputElement<string> {
    static override tagName: "prose-mirror";

    disconnectedCallback(): void;

    /** Configure ProseMirror editor plugins. */
    protected _configurePlugins(): Record<string, ProseMirror.Plugin>;

    /** Create a HTMLProseMirrorElement using provided configuration data. */
    static create(config: ProseMirrorInputConfig): HTMLProseMirrorElement;
}

declare global {
    interface ProseMirrorInputConfig extends FormInputConfig<string> {
        /** Is this editor toggled (true) or always active (false) */
        toggled: boolean;
        /** If the editor is toggled, provide the enrichedHTML which is displayed while the editor is not active */
        enriched?: string;
        /** Does this editor instance support collaborative editing? */
        collaborate: boolean;
        /** A Document UUID. Required for collaborative editing */
        documentUUID?: DocumentUUID;
    }
}
