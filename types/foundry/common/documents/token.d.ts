import type * as abstract from "../abstract/module.d.ts";
import type * as data from "../data/data.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";

/**
 * The Token document model.
 * @param data Initial data from which to construct the document.
 * @property data The constructed data object for the document.
 */
export default class BaseToken<
    TParent extends documents.BaseScene | null = documents.BaseScene | null,
> extends abstract.Document<TParent, TokenSchema> {
    static override get metadata(): TokenMetadata;

    static override defineSchema(): TokenSchema;

    /** The default icon used for newly created Token documents */
    static DEFAULT_ICON: ImageFilePath | VideoFilePath;
}

export default interface BaseToken<TParent extends documents.BaseScene | null = documents.BaseScene | null>
    extends abstract.Document<TParent, TokenSchema>,
        ModelPropsFromSchema<TokenSchema> {
    delta: documents.BaseActorDelta<this> | null;
    light: data.LightData<this>;
}

interface TokenMetadata extends abstract.DocumentMetadata {
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
    delta: ActorDeltaField<documents.BaseActorDelta<BaseToken>>;
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
            range: fields.NumberField<number, number, true>;
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
        effects: fields.NumberField;
        subject: fields.SchemaField<{
            scale: fields.NumberField;
            texture: fields.FilePathField<ImageFilePath>;
        }>;
    }>;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
};

export type TokenSource = SourceFromSchema<TokenSchema>;

declare class ActorDeltaField<
    TDocument extends documents.BaseActorDelta<BaseToken> = documents.BaseActorDelta<BaseToken>,
> extends fields.EmbeddedDocumentField<TDocument> {
    override initialize(
        value: fields.MaybeSchemaProp<TDocument["_source"], true, true, true>,
        model?: ConstructorOf<TDocument>,
        options?: object,
    ): fields.MaybeSchemaProp<TDocument, true, true, true>;
}
