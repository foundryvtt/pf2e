import * as CONST from "@common/constants.mjs";
import { GridType } from "@common/constants.mjs";

/**
 * The grid mesh data.
 */
export interface GridMeshData {
    /** The type of the grid (see {@link CONST.GRID_TYPES}) */
    type: GridType;
    /** The width of the grid in pixels */
    width: number;
    /** The height of the grid in pixels */
    height: number;
    /** The size of a grid space in pixels */
    size: number;
    /** The thickness of the grid lines in pixels */
    thickness: number;
    /** The color of the grid */
    color: number;
    /** The alpha of the grid */
    alpha: number;
}
