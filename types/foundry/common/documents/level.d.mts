import { ImageFilePath, TextureDataFitMode, VideoFilePath } from "@common/constants.mjs";
import Document, { DocumentMetadata } from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import BaseScene from "./scene.mjs";

/**
 * The Level Document.
 * Defines the DataSchema and common behaviors for a Level which are shared between both client and server.
 * @category Documents
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
export default class BaseLevel<TParent extends BaseScene | null> extends Document<TParent, LevelSchema> {
    /* ---------------------------------------- */
    /*  Model Configuration                     */
    /* ---------------------------------------- */

    static override metadata: LevelMetadata;

    static override LOCALIZATION_PREFIXES: string[];

    static override defineSchema(): LevelSchema;
}

export default interface BaseLevel<TParent extends BaseScene | null>
    extends Document<TParent, LevelSchema>, fields.ModelPropsFromSchema<LevelSchema> {
    get documentName(): LevelMetadata["name"];
}

interface LevelMetadata extends DocumentMetadata {
    name: "Level";
    collection: "levels";
    label: "DOCUMENT.Level";
    labelPlural: "DOCUMENT.Levels";
    isEmbedded: true;
}

type LevelSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    elevation: fields.SchemaField<{
        bottom: fields.NumberField<number, number, true, true, true>; // Treat null as -Infinity
        top: fields.NumberField<number, number, true, true, true>; // Treat null as +Infinity
    }>;
    background: fields.SchemaField<{
        color: fields.ColorField<false, false, true>;
        src: fields.FilePathField<ImageFilePath | VideoFilePath, ImageFilePath | VideoFilePath, true, true, true>;
        tint: fields.ColorField<true, false, true>;
        alphaThreshold: fields.AlphaField;
    }>;
    foreground: fields.SchemaField<{
        src: fields.FilePathField<ImageFilePath | VideoFilePath, ImageFilePath | VideoFilePath, true, true, true>;
        tint: fields.ColorField<true, false, true>;
        alphaThreshold: fields.AlphaField;
    }>;
    fog: fields.SchemaField<{
        src: fields.FilePathField<ImageFilePath | VideoFilePath, ImageFilePath | VideoFilePath, true, true, true>;
        tint: fields.ColorField<true, false, true>;
    }>;
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
    visibility: fields.SchemaField<{
        levels: fields.SceneLevelsSetField;
    }>;
    sort: fields.IntegerSortField;
    flags: fields.DocumentFlagsField;
};

export {};
