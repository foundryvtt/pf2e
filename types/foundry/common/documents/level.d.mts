import { ImageFilePath, TextureDataFitMode, VideoFilePath } from "@common/constants.mjs";
import Document from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import BaseScene from "./scene.mjs";
import { DocumentClassMetadata } from "@common/abstract/_module.mjs";

/**
 * The Level Document.
 * Defines the DataSchema and common behaviors for a Level which are shared between both client and server.
 *
 * @example Create Scene Levels
 * ```js
 * await canvas.scene.createEmbeddedDocuments("Level", [
 *   {
 *     name: "Basement",
 *     elevation: {bottom: -10, top: 0},
 *     background: {
 *       src: "worlds/scene-levels-test/assets/cabin/BasementBackground.webp"
 *     },
 *     foreground: {
 *       src: "worlds/scene-levels-test/assets/cabin/BasementForeground.webp"
 *     }
 *   },
 *   {
 *     name: "Downstairs",
 *     elevation: {bottom: 0, top: 10},
 *     background: {
 *       src: "worlds/scene-levels-test/assets/cabin/DownstairsBackground.webp"
 *     },
 *     foreground: {
 *       src: "worlds/scene-levels-test/assets/cabin/DownstairsForeground.webp"
 *     }
 *   },
 *   {
 *     name: "Upstairs",
 *     elevation: {bottom: 10, top: 20},
 *     background: {
 *       src: "worlds/scene-levels-test/assets/cabin/UpstairsBackground.webp"
 *     },
 *     foreground: {
 *       src: "worlds/scene-levels-test/assets/cabin/UpstairsForeground.webp"
 *     }
 *   }
 * ]);
 * ```
 */
export default class BaseLevel<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    LevelSchema
> {
    /* ---------------------------------------- */
    /*  Model Configuration                     */
    /* ---------------------------------------- */

    static override metadata: Readonly<LevelMetadata>;

    static override LOCALIZATION_PREFIXES: string[];

    static override defineSchema(): LevelSchema;
}

export default interface BaseLevel<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, LevelSchema>, fields.ModelPropsFromSchema<LevelSchema> {
    get documentName(): LevelMetadata["name"];
}

interface LevelMetadata extends DocumentClassMetadata {
    name: "Level";
    collection: "levels";
    label: "DOCUMENT.Level";
    labelPlural: "DOCUMENT.Levels";
    isEmbedded: true;
}

type LevelSchema = {
    /** The _id which uniquely identifies this Level document */
    _id: fields.DocumentIdField;
    /** The name of this Level */
    name: fields.StringField<string, string, true, false, false>;
    /** Data related to the elevation range of this Level */
    elevation: fields.SchemaField<{
        bottom: fields.NumberField<number, number, true, true, true>; // Treat null as -Infinity
        top: fields.NumberField<number, number, true, true, true>; // Treat null as +Infinity
    }>;
    /** Data related to the background of this Level */
    background: fields.SchemaField<{
        color: fields.ColorField<false, false, true>;
        src: fields.FilePathField<ImageFilePath | VideoFilePath, ImageFilePath | VideoFilePath, true, true, true>;
        tint: fields.ColorField<true, false, true>;
        alphaThreshold: fields.AlphaField;
    }>;
    /** Data related to the foreground of this Level */
    foreground: fields.SchemaField<{
        src: fields.FilePathField<ImageFilePath | VideoFilePath, ImageFilePath | VideoFilePath, true, true, true>;
        tint: fields.ColorField<true, false, true>;
        alphaThreshold: fields.AlphaField;
    }>;
    /** Data related to the fog settings of this Level */
    fog: fields.SchemaField<{
        src: fields.FilePathField<ImageFilePath | VideoFilePath, ImageFilePath | VideoFilePath, true, true, true>;
        tint: fields.ColorField<true, false, true>;
    }>;
    /** Data related to the positioning of textures for this Level */
    textures: fields.SchemaField<{
        anchorX: fields.NumberField<number, number, true, false, true>;
        anchorY: fields.NumberField<number, number, true, false, true>;
        offsetX: fields.NumberField<number, number, true, false, true>;
        offsetY: fields.NumberField<number, number, true, false, true>;
        fit: fields.StringField<TextureDataFitMode, TextureDataFitMode, true, false, true>;
        scaleX: fields.NumberField<number, number, true, false, true>;
        scaleY: fields.NumberField<number, number, true, false, true>;
        rotation: fields.AngleField;
    }>;
    /** Data related to the visibility of this Level */
    visibility: fields.SchemaField<{
        levels: fields.SceneLevelsSetField;
    }>;
    /** The numeric sort value which orders this Level relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
};

export type LevelSource = fields.SourceFromSchema<LevelSchema>;
