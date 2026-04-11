import { CanvasEdges } from "@client/canvas/geometry/edges/edges.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteOperation,
} from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import { BaseLevel, BaseUser } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";
import Scene from "./scene.mjs";

interface ClientBaseLevelStatic extends Omit<typeof BaseLevel, "new">, ClientDocumentStatic {}

declare const ClientBaseLevel: {
    new <TParent extends Scene | null>(...args: any): BaseLevel<TParent> & ClientDocument<TParent>;
} & ClientBaseLevelStatic;

interface ClientBaseLevel<TParent extends Scene | null> extends InstanceType<typeof ClientBaseLevel<TParent>> {}

export default class Level<TParent extends Scene | null = Scene | null> extends ClientBaseLevel<TParent> {
    /**
     * The integer index of the Level, assigned during Scene data preparation.
     */
    index: number;

    /**
     * Is this level currently viewed?
     */
    get isView(): boolean;

    /**
     * Is this level currently visible?
     */
    get isVisible(): boolean;

    /**
     * The edges of this Level.
     */
    get edges(): CanvasEdges;

    /* -------------------------------------------- */
    /*  Document Preparation                        */
    /* -------------------------------------------- */

    override prepareBaseData(): void;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    static override _onCreateOperation<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        items: TDocument[],
        context: DatabaseCreateOperation<TDocument["parent"]>,
    ): Promise<void>;

    static override _onDeleteOperation(
        documents: Document[],
        operation: DatabaseDeleteOperation<Document | null>,
        user: BaseUser,
    ): Promise<void>;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Clamp the given elevation (of a token with a depth) to the elevation range of this Level.
     *
     * The elevation is clamped such that the head of the token is in the range if possible, but
     * the feet are never outside of the range.
     * @param elevation The elevation (of the token)
     * @param depth The depth of the token
     * @returns The clamped elevation
     */
    clampElevation(elevation: number, depth?: number): number;
}

export default interface Level<TParent extends Scene | null = Scene | null> extends ClientBaseLevel<TParent> {}

export {};
