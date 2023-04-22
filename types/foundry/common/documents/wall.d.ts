import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseScene, BaseUser } from "./module.d.ts";

/** The Wall embedded document model. */
export default class BaseWall<TParent extends BaseScene | null> extends Document<TParent> {
    static override get metadata(): WallMetadata;

    /** Is a user able to update an existing Wall? */
    protected static _canUpdate(user: BaseUser, doc: BaseWall<BaseScene | null>, data: WallSource): boolean;

    light: WallSenseType;
    move: WallSenseType;
    sight: WallSenseType;
    sound: WallSenseType;
}

export default interface BaseWall<TParent extends BaseScene | null> extends Document<TParent> {
    readonly _source: WallSource;
}

interface WallSource {
    c: number[];
    move?: number;
    sense?: number;
    dir?: number;
    door?: number;
    ds?: number;
}

interface WallMetadata extends DocumentMetadata {
    name: "Wall";
    collection: "walls";
    label: "DOCUMENT.Wall";
    isEmbedded: true;
    permissions: {
        create: "ASSISTANT";
        update: (typeof BaseWall)["_canUpdate"];
        delete: "ASSISTANT";
    };
}
