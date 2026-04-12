import { PluginKey } from "prosemirror-state";
import { ProseMirrorMenuItem } from "../_types.mjs";
import ProseMirrorMenu from "../menu.mjs";

/**
 * A ProseMirror menu implementation specialized for the chat editor.
 */
export default class ChatMenuPlugin extends ProseMirrorMenu {
    static override key: PluginKey;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override render(): this;

    protected override _getMenuItems(): ProseMirrorMenuItem[];

    /**
     * Spawn a dialog for editing the message's source HTML.
     */
    protected _editSource(): void;
}
