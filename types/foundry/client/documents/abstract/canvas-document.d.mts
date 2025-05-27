import { PlaceablesLayer } from "@client/canvas/layers/_module.mjs";
import PlaceableObject from "@client/canvas/placeables/placeable-object.mjs";
import {
    DatabaseCreateOperation,
    DatabaseDeleteOperation,
    DatabaseUpdateOperation,
} from "@common/abstract/_module.mjs";
import Document from "@common/abstract/document.mjs";
import User from "../user.mjs";
import { ClientDocument, ClientDocumentStatic } from "./client-document.mjs";

/**
 * A specialized subclass of the ClientDocumentMixin which is used for document types that are intended to be
 * represented upon the game Canvas.
 * @category Mixins
 * @param Base The base document class mixed with client and canvas features
 */
export default function CanvasDocumentMixin<TParent extends Document | null, TDocument extends Document<TParent>>(
    Base: ConstructorOf<TDocument>,
): ConstructorOf<CanvasDocument<TParent> & TDocument>;

/**
 * A ClientDocument class with additional facilities for utilizing the {@link foundry.canvas.Canvas} API
 */
export class CanvasDocument<TParent extends Document | null = Document | null> extends ClientDocument<TParent> {
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A lazily constructed PlaceableObject instance which can represent this Document on the game canvas.
     * @returns {PlaceableObject|null}
     */
    get object(): PlaceableObject | null;

    /**
     * Has this object been deliberately destroyed as part of the deletion workflow?
     * @internal
     */
    _destroyed: boolean;

    /**
     * A reference to the CanvasLayer which contains Document objects of this type.
     */
    get layer(): PlaceablesLayer;

    /**
     * An indicator for whether this document is currently rendered on the game canvas.
     */
    get rendered(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: Record<string, unknown>,
        options: DatabaseCreateOperation<TParent>,
        user: User,
    ): Promise<boolean | void>;

    protected override _onCreate(
        data: this["_source"],
        options: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void;

    protected override _onDelete(options: DatabaseDeleteOperation<TParent>, userId: string): void;
}

export interface CanvasDocumentStatic extends ClientDocumentStatic {}
