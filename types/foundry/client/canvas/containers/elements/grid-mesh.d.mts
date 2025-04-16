import GridShader from "../../rendering/shaders/grid/grid.mjs";
import { GridMeshData } from "../_types.mjs";
import QuadMesh from "./quad-mesh.mjs";

/**
 * @import {GridMeshData} from "../_types.mjs"
 */

/**
 * The grid mesh, which uses the {@link GridShader} to render the grid.
 */
export default class GridMesh extends QuadMesh {
    /**
     * The grid mesh constructor.
     */
    constructor(shaderClass?: typeof GridShader);

    /**
     * The data of this mesh.
     */
    data: GridMeshData;

    /**
     * Initialize and update the mesh given the (partial) data.
     * @param data The (partial) data.
     */
    initialize(data: Partial<GridMeshData>): this;

    /**
     * Initialize the data of this mesh given the (partial) data.
     * @param data The (partial) data.
     */
    protected _initialize(data: Partial<GridMeshData>): void;
}
