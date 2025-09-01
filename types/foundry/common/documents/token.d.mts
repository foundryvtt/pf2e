import { ElevatedPoint, TokenDimensions, TokenPosition } from "@common/_types.mjs";
import Document, { DocumentMetadata } from "@common/abstract/document.mjs";
import { ImageFilePath, TokenDisplayMode, TokenDisposition, VideoFilePath } from "@common/constants.mjs";
import { GridOffset3D } from "@common/grid/_types.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseActorDelta, BaseScene } from "./_module.mjs";

/**
 * The Token document model.
 * @param data Initial data from which to construct the document.
 * @property data The constructed data object for the document.
 */
export default class BaseToken<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    TokenSchema
> {
    static override get metadata(): TokenMetadata;

    static override defineSchema(): TokenSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /**
     * The fields of the data model for which changes count as a movement action.
     */
    static readonly MOVEMENT_FIELDS: ["x", "y", "elevation", "width", "height", "shape"];

    /**
     * Are the given positions equal?
     */
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
}

export default interface BaseToken<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, TokenSchema>,
        fields.ModelPropsFromSchema<TokenSchema> {
    delta: BaseActorDelta<this> | null;
    light: data.LightData<this>;
}

interface TokenMetadata extends DocumentMetadata {
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
    /** The Token _id which uniquely identifies it within its parent Scene */
    _id: fields.DocumentIdField;
    /** The name used to describe the Token */
    name: fields.StringField<string, string, true>;
    /** The display mode of the Token nameplate, from CONST.TOKEN_DISPLAY_MODES */
    displayName: fields.NumberField<TokenDisplayMode, TokenDisplayMode, true, false, true>;
    /** The _id of an Actor document which this Token represents */
    actorId: fields.ForeignDocumentField<string>;
    /** Does this Token uniquely represent a singular Actor, or is it one of many? */
    actorLink: fields.BooleanField;
    /**
     * The ActorDelta embedded document which stores the differences between this token and the base actor it
     * represents.
     */
    // delta: ActorDeltaField;
    appendNumber: fields.BooleanField;
    prependAdjective: fields.BooleanField;
    /** The width of the Token in grid units */
    width: fields.NumberField<number, number, true, false>;
    /** The height of the Token in grid units */
    height: fields.NumberField<number, number, true, false>;
    /** The token's texture on the canvas. */
    texture: data.TextureData;
    hexagonalShape: fields.NumberField;
    /** The x-coordinate of the top-left corner of the Token */
    x: fields.NumberField<number, number, true, false>;
    /** The y-coordinate of the top-left corner of the Token */
    y: fields.NumberField<number, number, true, false>;
    /** The vertical elevation of the Token, in distance units */
    elevation: fields.NumberField<number, number, true, false>;
    sort: fields.NumberField<number, number, true, false, true>;
    locked: fields.BooleanField;
    /** Prevent the Token image from visually rotating? */
    lockRotation: fields.BooleanField;
    /** The rotation of the Token in degrees, from 0 to 360. A value of 0 represents a southward-facing Token. */
    rotation: fields.AngleField;
    /** An array of effect icon paths which are displayed on the Token */
    effects: fields.ArrayField<
        fields.FilePathField<ImageFilePath | VideoFilePath, ImageFilePath | VideoFilePath, true, false>
    >;
    /** The opacity of the token image */
    alpha: fields.AlphaField;
    /** Is the Token currently hidden from player view? */
    hidden: fields.BooleanField;
    /** A displayed Token disposition from CONST.TOKEN_DISPOSITIONS */
    disposition: fields.NumberField<TokenDisposition, TokenDisposition, true>;
    /** The display mode of Token resource bars, from CONST.TOKEN_DISPLAY_MODES */
    displayBars: fields.NumberField<TokenDisplayMode, TokenDisplayMode, true>;
    /** The configuration of the Token's primary resource bar */
    bar1: fields.SchemaField<{
        /** The attribute path within the Token's Actor data which should be displayed */
        attribute: fields.StringField<string, string, true, true, true>;
    }>;
    /** The configuration of the Token's secondary resource bar */
    bar2: fields.SchemaField<{
        /** The attribute path within the Token's Actor data which should be displayed */
        attribute: fields.StringField<string, string, true, true, true>;
    }>;
    /** Configuration of the light source that this Token emits */
    light: fields.EmbeddedDataField<data.LightData<BaseToken>>;
    /** Configuration of sight and vision properties for the Token */
    sight: fields.SchemaField<{
        /** Should vision computation and rendering be active for this Token? */
        enabled: fields.BooleanField;
        /** How far in distance units the Token can see without the aid of a light source */
        range: fields.NumberField<number, number, true, true, true>;
        /** An angle at which the Token can see relative to their direction of facing */
        angle: fields.AngleField;
        /** The vision mode which is used to render the appearance of the visible area */
        visionMode: fields.StringField<string, string, true, false, true>;
        /** A special color which applies a hue to the visible area */
        color: fields.ColorField;
        /** A degree of attenuation which gradually fades the edges of the visible area */
        attenuation: fields.AlphaField;
        /** An advanced customization for the perceived brightness of the visible area */
        brightness: fields.NumberField<number, number, true, false>;
        /** An advanced customization of color saturation within the visible area */
        saturation: fields.NumberField<number, number, true, false>;
        /** An advanced customization for contrast within the visible area */
        contrast: fields.NumberField<number, number, true, false>;
    }>;
    /** An array of detection modes which are available to this Token */
    detectionModes: fields.ArrayField<
        fields.SchemaField<{
            /** The id of the detection mode, a key from CONFIG.Canvas.detectionModes */
            id: fields.StringField<string>;
            /** Whether or not this detection mode is presently enabled */
            enabled: fields.BooleanField;
            /** The maximum range in distance units at which this mode can detect targets */
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

    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
};

export type TokenSource = fields.SourceFromSchema<TokenSchema>;

export class ActorDeltaField<
    TDocument extends BaseActorDelta<BaseToken> = BaseActorDelta<BaseToken>,
> extends fields.EmbeddedDocumentField<TDocument> {
    override initialize(
        value: fields.MaybeSchemaProp<TDocument["_source"], true, true, true>,
        model?: TDocument | null,
        options?: object,
    ): fields.MaybeSchemaProp<TDocument, true, true, true>;
}
