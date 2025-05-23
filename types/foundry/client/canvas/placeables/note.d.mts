import { JournalEntry, NoteDocument, Scene, User } from "@client/documents/_module.mjs";
import { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.mjs";
import { ControlIcon } from "../containers/_module.mjs";
import NotesLayer from "../layers/notes.mjs";
import PlaceableObject from "./placeable-object.mjs";

/**
 * A Note is an implementation of PlaceableObject which represents an annotated location within the Scene.
 * Each Note links to a JournalEntry document and represents its location on the map.
 * @todo fill in ... some day
 */
export default class Note<
    TDocument extends NoteDocument<Scene | null> = NoteDocument<Scene | null>,
> extends PlaceableObject<TDocument> {
    static override embeddedName: "Note";

    override get bounds(): PIXI.Rectangle;

    /** The associated JournalEntry which is referenced by this Note */
    get entry(): JournalEntry;

    /** The text label used to annotate this Note */
    get text(): string;

    /** The Map Note icon size */
    get size(): number;

    /**
     * Determine whether the Note is visible to the current user based on their perspective of the Scene.
     * Visibility depends on permission to the underlying journal entry, as well as the perspective of controlled Tokens.
     * If Token Vision is required, the user must have a token with vision over the note to see it.
     */
    get isVisible(): boolean;

    /* -------------------------------------------- */
    /* Rendering                                    */
    /* -------------------------------------------- */

    protected _draw(): Promise<void>;

    /** Draw the ControlIcon for the Map Note */
    protected _drawControlIcon(): ControlIcon;

    /** Draw the map note Tooltip as a Text object*/
    protected _drawTooltip(): PIXI.Text;

    /** Define a PIXI TextStyle object which is used for the tooltip displayed for this Note */
    protected _getTextStyle(): PIXI.TextStyle;

    override refresh(): this;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onUpdate(
        changed: DeepPartial<TDocument["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _canHover(user: User): boolean;
}

export default interface Note<TDocument extends NoteDocument<Scene | null> = NoteDocument<Scene | null>>
    extends PlaceableObject<TDocument> {
    get layer(): NotesLayer<this>;
}
