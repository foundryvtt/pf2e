import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseScene } from "./module.d.ts";

/** The AmbientLight embedded document model. */
export default class BaseAmbientLight<TParent extends BaseScene | null> extends Document<TParent> {
    static override get metadata(): AmbientLightMetadata;

    config: foundry.data.LightData;

    protected override _initialize(): void;
}

export default interface BaseAmbientLight<TParent extends BaseScene | null> extends Document<TParent> {
    readonly _source: AmbientLightSource;
}

/**
 * The data schema for a AmbientLight embedded document.
 *
 * @property _id            The _id which uniquely identifies this BaseAmbientLight embedded document
 * @property [x=0]          The x-coordinate position of the origin of the light
 * @property [y=0]          The y-coordinate position of the origin of the light
 * @property [rotation=0]   The angle of rotation for the tile between 0 and 360
 * @property [walls=true]   Whether or not this light source is constrained by Walls
 * @property [vision=false] Whether or not this light source provides a source of vision
 * @property config         Light configuration data
 * @property [hidden=false] Is the light source currently hidden?
 * @property [flags={}]     An object of optional key/value flags
 */
interface AmbientLightSource {
    _id: string;
    t: string;
    x: number;
    y: number;
    rotation: number;
    walls: boolean;
    vision: boolean;
    config: foundry.data.LightSource;
    hidden: boolean;
    flags: Record<string, unknown>;
}

interface AmbientLightMetadata extends DocumentMetadata {
    name: "AmbientLight";
    collection: "lights";
    label: "DOCUMENT.AmbientLight";
    isEmbedded: true;
}
