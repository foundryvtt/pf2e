import { TerrainData } from "@client/data/terrain-data.mjs";
import { ElevatedPoint } from "@common/_types.mjs";
import Document from "@common/abstract/document.mjs";
import {
    ImageFilePath,
    TokenDisplayMode,
    TokenDisposition,
    TokenShapeType,
    VideoFilePath,
} from "@common/constants.mjs";
import { GridOffset3D } from "@common/grid/_types.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseActorDelta, BaseScene } from "./_module.mjs";
import { TokenDimensions, TokenPosition } from "./_types.mjs";
import { DocumentClassMetadata } from "@common/abstract/_module.mjs";

/**
 * The Token Document.
 * Defines the DataSchema and common behaviors for a Token which are shared between both client and server.
 */
export default class BaseToken<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    TokenSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<TokenMetadata>;

    static override defineSchema(): TokenSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /** The fields of the data model for which changes count as a movement action. */
    static readonly MOVEMENT_FIELDS: ["x", "y", "elevation", "width", "height", "shape"];

    /** Are the given positions equal? */
    static arePositionsEqual(position1: TokenPosition, position2: TokenPosition): boolean;

    /** The default icon used for newly created Token documents */
    static DEFAULT_ICON: ImageFilePath | VideoFilePath;

    /* -------------------------------------------- */
    /*  Token Methods                               */
    /* -------------------------------------------- */

    /**
     * Get the snapped position of the Token.
     * @param data The position and dimensions
     * @returns The snapped position
     */
    getSnappedPosition(data?: Partial<TokenPosition>): ElevatedPoint;

    /**
     * Get the top-left grid offset of the Token.
     * @param data The position and dimensions
     * @returns GridOffset3D The top-left grid offset
     * @internal
     */
    _positionToGridOffset(data?: Partial<TokenPosition>): GridOffset3D;

    /**
     * Get the position of the Token from the top-left grid offset.
     * @param offset The top-left grid offset
     * @param data The dimensions that override the current dimensions
     * @returns The snapped position
     * @internal
     */
    _gridOffsetToPosition(offset: GridOffset3D, data?: Partial<TokenDimensions>): ElevatedPoint;

    /**
     * Get the width and height of the Token in pixels.
     * @param data The width and/or height in grid units (must be positive)
     * @returns The width and height in pixels
     */
    getSize(data?: { width?: number; height?: number }): { width: number; height: number };

    /* -------------------------------------------- */
    /*  Document Methods                            */
    /* -------------------------------------------- */

    override getUserLevel(user: foundry.documents.BaseUser): CONST.DocumentOwnershipNumber;

    override toObject(source?: boolean): this["_source"];
}

export default interface BaseToken<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, TokenSchema>, fields.ModelPropsFromSchema<TokenSchema> {
    delta: BaseActorDelta<this> | null;
    light: data.LightData<this>;
}

interface TokenMetadata extends DocumentClassMetadata {
    name: "Token";
    collection: "tokens";
    label: "DOCUMENT.Token";
    labelPlural: "DOCUMENT.Tokens";
    isEmbedded: true;
    embedded: {
        ActorDelta: "delta";
    };
}

type TokenSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true>;
    displayName: fields.NumberField<TokenDisplayMode, TokenDisplayMode, true, false, true>;
    actorId: fields.ForeignDocumentField<string>;
    actorLink: fields.BooleanField;
    delta: ActorDeltaField;
    x: fields.NumberField<number, number, true, false, true>;
    y: fields.NumberField<number, number, true, false, true>;
    elevation: fields.NumberField<number, number, true, false, true>;
    width: fields.NumberField<number, number, true, false, true>;
    height: fields.NumberField<number, number, true, false, true>;
    depth: fields.NumberField<number, number, true, false, true>;
    shape: fields.NumberField<TokenShapeType, TokenShapeType, false, true, true>;
    level: fields.DocumentIdField<string, true, false, true>;
    texture: data.TextureData;
    sort: fields.NumberField<number, number, true, false, true>;
    locked: fields.BooleanField;
    lockRotation: fields.BooleanField;
    rotation: fields.AngleField;
    alpha: fields.AlphaField;
    hidden: fields.BooleanField;
    disposition: fields.NumberField<TokenDisposition, TokenDisposition, true>;
    displayBars: fields.NumberField<TokenDisplayMode, TokenDisplayMode, true>;
    bar1: fields.SchemaField<{
        attribute: fields.StringField<string, string, true, true, true>;
    }>;
    bar2: fields.SchemaField<{
        attribute: fields.StringField<string, string, true, true, true>;
    }>;
    light: fields.EmbeddedDataField<data.LightData<BaseToken>>;
    sight: fields.SchemaField<{
        enabled: fields.BooleanField;
        range: fields.NumberField<number, number, true, true, true>;
        angle: fields.AngleField;
        visionMode: fields.StringField<string, string, true, false, true>;
        color: fields.ColorField;
        attenuation: fields.AlphaField;
        brightness: fields.NumberField<number, number, true, false>;
        saturation: fields.NumberField<number, number, true, false>;
        contrast: fields.NumberField<number, number, true, false>;
    }>;
    detectionModes: fields.TypedObjectField<
        fields.SchemaField<{
            enabled: fields.BooleanField;
            range: fields.NumberField<number, number, true, true, true>;
        }>
    >;
    occludable: fields.SchemaField<{
        radius: fields.NumberField<number, number, false, false>;
    }>;
    ring: fields.SchemaField<{
        enabled: fields.BooleanField;
        colors: fields.SchemaField<{
            ring: fields.ColorField;
            background: fields.ColorField;
        }>;
        effects: fields.NumberField<number, number, true, false, true>;
        subject: fields.SchemaField<{
            scale: fields.NumberField;
            texture: fields.FilePathField<ImageFilePath>;
        }>;
    }>;
    turnMarker: fields.SchemaField<{
        mode: fields.NumberField<number, number, true, true, true>;
        animation: fields.StringField<string, string, true, true, true>;
        src: fields.FilePathField<ImageFilePath | VideoFilePath>;
        disposition: fields.BooleanField;
    }>;
    movementAction: fields.StringField<string, string, true, true, true>;
    /** @internal */
    _movementHistory: fields.ArrayField<
        fields.SchemaField<{
            x: fields.NumberField<number, number, true, false, true>;
            y: fields.NumberField<number, number, true, false, true>;
            elevation: fields.NumberField<number, number, true, false, true>;
            width: fields.NumberField<number, number, true, false, true>;
            height: fields.NumberField<number, number, true, false, true>;
            depth: fields.NumberField<number, number, true, false, true>;
            shape: fields.NumberField<TokenShapeType, TokenShapeType, false, true, true>;
            action: fields.StringField<string, string, true, false, false>;
            terrain: fields.EmbeddedDataField<TerrainData, true, true, false>;
            snapped: fields.BooleanField<boolean, boolean, true, false, false>;
            explicit: fields.BooleanField<boolean, boolean, true, false, false>;
            checkpoint: fields.BooleanField<boolean, boolean, true, false, false>;
            intermediate: fields.BooleanField<boolean, boolean, true, false, false>;
            userId: fields.ForeignDocumentField<string, true, true, false>;
            movementId: fields.StringField<string, string, true, false, false>;
            subpathId: fields.StringField<string, string, true, false, false>;
            cost: fields.NumberField<number, number, true, true, false>;
        }>
    >;
    /** @internal */
    _regions: fields.ArrayField<fields.ForeignDocumentField<string>>;
    flags: fields.DocumentFlagsField;
};

export type TokenSource = fields.SourceFromSchema<TokenSchema>;

/**
 * A special subclass of EmbeddedDocumentField which allows construction of the ActorDelta to be lazily evaluated.
 */
export class ActorDeltaField extends fields.EmbeddedDocumentField<Document> {
    override initialize(
        value: fields.MaybeSchemaProp<object, true, true, true>,
        model?: Document,
        options?: Record<string, unknown>,
    ): fields.MaybeSchemaProp<BaseActorDelta<BaseToken>, true, true, true>;
}
