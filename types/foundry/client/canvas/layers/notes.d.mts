import { SceneControl } from "@client/applications/ui/scene-controls.mjs";
import Note from "../placeables/note.d.mjs";
import { PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

/**
 * The Notes Layer which contains Note canvas objects.
 * @category Canvas
 */
export default class NotesLayer<TObject extends Note = Note> extends PlaceablesLayer<TObject> {
    static override get layerOptions(): PlaceablesLayerOptions;

    static override documentName: "Note";

    /** The named core setting which tracks the toggled visibility state of map notes */
    static TOGGLE_SETTING: string;

    override get hookName(): string;

    override interactiveChildren: boolean;

    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */

    override _getCopyableObjects(options: object): TObject[];

    protected override _deactivate(): void;

    protected override _draw(options?: object): Promise<void>;

    /** Register game settings used by the NotesLayer */
    static registerSettings(): void;

    /**
     * Pan to a given note on the layer.
     * @param note                    The note to pan to.
     * @param [options]               Options which modify the pan operation.
     * @param [options.scale=1.5]     The resulting zoom level.
     * @param [options.duration=250]  The speed of the pan animation in milliseconds.
     * @returns  A Promise which resolves once the pan animation has concluded.
     */
    panToNote(note: TObject, options?: { scale?: number; duration?: number }): Promise<void>;

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

    /**
     * Handle JournalEntry document drop data
     * @param event  The drag drop event
     * @param data   The dropped data transfer data
     */
    protected _onDropData(event: DragEvent, data: object): Promise<TObject>;
}
