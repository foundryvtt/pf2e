import Token from "@client/canvas/placeables/token.mjs";
import { TokenMovementCostFunction } from "@client/documents/_types.mjs";
import TokenDocument from "@client/documents/token.mjs";
import { DataSchema } from "@common/abstract/_types.mjs";
import DataModel from "@common/abstract/data.mjs";
import * as fields from "@common/data/fields.mjs";
import { TokenMeasureMovementPathOptions } from "../_types.mjs";

/**
 * The base TerrainData.
 */
export abstract class BaseTerrainData<TSchema extends DataSchema = DataSchema> extends DataModel<null, TSchema> {
    /**
     * Create the terrain data from the given array of terrain effects.
     * The type of the terrain effects and data is system-defined.
     * The terrain effects are not passed in any particular order.
     * Ownership of the array is passed to this function.
     * This function must return null if the array of terrain effects is empty.
     * @param effects An array of terrain effects
     * @returns The terrain data or null
     */
    static resolveTerrainEffects(effects: object[]): BaseTerrainData;

    /**
     * Create the terrain movement cost function for the given token.
     * Only movement cost that is caused by the terrain should be calculated by this function,
     * which includes the base movement cost.
     * Extra movement cost unrelated to terrain must be calculated in
     * {@link Token#_getMovementCostFunction | Token#_getMovementCostFunction}.
     * In square and hexagonal grids it calculates the cost for single grid space move between two grid space offsets.
     * For tokens that occupy more than one grid space the cost of movement is calculated as the median of all individual
     * grid space moves unless the cost of any of these is infinite, in which case total cost is always infinite.
     * In gridless grids the `from` and `to` parameters of the cost function are top-left offsets.
     * If the movement cost function is undefined, the cost equals the distance moved.
     * @param token   The Token that moves
     * @param options Additional options that affect cost calculations
     */
    static getMovementCostFunction(
        token: TokenDocument,
        options?: TokenMeasureMovementPathOptions,
    ): TokenMovementCostFunction | void;

    /**
     * Is this terrain data the same as some other terrain data?
     * @param other Some other terrain data
     * @returns Are the terrain datas equal?
     */
    abstract equals(other: BaseTerrainData): boolean;
}

/**
 * The core TerrainData implementation.
 */
export class TerrainData extends BaseTerrainData {
    static override defineSchema(): TerrainDataSchema;

    static override resolveTerrainEffects(effects: Partial<TerrainDataSource>[]): TerrainData;

    static override getMovementCostFunction(
        token: TokenDocument,
        options?: TokenMeasureMovementPathOptions,
    ): TokenMovementCostFunction;

    prepareBaseData(): void;

    override equals(other: BaseTerrainData): boolean;
}

export interface TerrainData extends BaseTerrainData, fields.ModelPropsFromSchema<TerrainDataSchema> {}

type TerrainDataSchema = {
    /** The difficulty of the terrain (the movement cost multiplier) */
    difficulty: fields.NumberField<number, number, true>;
};

type TerrainDataSource = fields.SourceFromSchema<TerrainDataSchema>;

export {};
