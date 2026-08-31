import type { PlaceablesLayerPointerEvent } from "@client/canvas/layers/base/placeables-layer.d.mts";
import type { Point } from "@common/_types.d.mts";
import type { GridSnappingMode } from "@common/constants.d.mts";
import type { CircleShapeData, ConeShapeData, LineShapeData } from "@common/data/data.d.mts";
import type { GridOffset2D } from "@common/grid/_types.d.mts";
import { EffectAreaShape } from "@item/types.ts";
import type { RegionDocumentPF2e } from "@scene/region-document/document.ts";
import { measureDistance } from "./helpers.ts";

/** Add support for drag/drop repositioning of regions. */
class RegionPF2e<TDocument extends RegionDocumentPF2e = RegionDocumentPF2e> extends fc.placeables.Region<TDocument> {
    /** Squares in range but walled off from the origin, shaded as blocked rather than covered */
    #blockedOffsets: GridOffset2D[] = [];

    /** Graphics for the blocked-square shading */
    #blockedHighlight: PIXI.Graphics | null = null;

    get snappingMode(): GridSnappingMode {
        const MODES = CONST.GRID_SNAPPING_MODES;
        switch (this.areaShape) {
            case "burst":
                return MODES.VERTEX;
            case "cone":
                return (MODES.CENTER | MODES.VERTEX | MODES.EDGE_MIDPOINT) as GridSnappingMode;
            case "line":
                return (MODES.EDGE_MIDPOINT | MODES.VERTEX) as GridSnappingMode;
            default:
                return (MODES.CENTER | MODES.VERTEX) as GridSnappingMode;
        }
    }

    get areaShape(): EffectAreaShape | null {
        return this.document.flags[SYSTEM_ID].areaShape ?? null;
    }

    override getSnappedPosition(position?: Point): Point {
        return this.layer.getSnappedPoint(position ?? this.center);
    }

    /** Cover the squares a burst, cone, or line effect area reaches, counted by PF2e's grid rules. */
    protected override _getCoveredGridSpaceOffsets(): GridOffset2D[] {
        this.#blockedOffsets = [];
        const shapeData = this.document.shapes.at(0);
        if (!canvas.grid.isSquare || this.document.shapes.length !== 1 || !shapeData) {
            return super._getCoveredGridSpaceOffsets();
        }
        // Bursts and cylinders are circles; only circles, cones, and lines are template shapes we count ourselves
        if (shapeData.type !== "circle" && shapeData.type !== "cone" && shapeData.type !== "line") {
            return super._getCoveredGridSpaceOffsets();
        }
        // Foundry doesn't give cone/line a literal `type`, so the union won't narrow without a cast
        const area = this.#areaCoverage(shapeData as CircleShapeData | ConeShapeData | LineShapeData);

        const { size } = canvas.dimensions;
        const grid = canvas.grid;
        const { i: col0, j: row0 } = grid.getOffset(grid.getCenterPoint(area.searchCenter));
        const span = Math.ceil(area.reach) + 1;

        const offsets: GridOffset2D[] = [];
        const blocked: GridOffset2D[] = [];
        for (let a = -span; a <= span; a++) {
            for (let b = -span; b <= span; b++) {
                const { x: gx, y: gy } = grid.getTopLeftPoint({ i: col0 + a, j: row0 + b });
                // Cell center, in pixels
                const destination = { x: gx + size * 0.5, y: gy + size * 0.5 };
                if (destination.x < 0 || destination.y < 0) continue;
                if (!area.contains(destination)) continue;

                // A wall between the origin and the cell center means no line of effect: blocked, not covered
                const offset = { i: col0 + a, j: row0 + b };
                const hasLineOfEffect =
                    !canvas.ready ||
                    !CONFIG.Canvas.polygonBackends.move.testCollision(area.origin, destination, {
                        type: "move",
                        mode: "any",
                    });
                (hasLineOfEffect ? offsets : blocked).push(offset);
            }
        }
        this.#blockedOffsets = blocked;

        return offsets;
    }

    /** Resolve a template shape into its line-of-effect origin, a cell-search box, and a coverage test. */
    #areaCoverage(shape: CircleShapeData | ConeShapeData | LineShapeData): AreaCoverage {
        const { size, distance } = canvas.dimensions;

        if (shape.type === "circle") {
            const circle = shape as CircleShapeData;
            const origin = { x: circle.x, y: circle.y };
            const radius = (circle.radius / size) * distance;
            return {
                origin,
                searchCenter: origin,
                reach: circle.radius / size,
                contains: (destination) => measureDistance(destination, origin) <= radius,
            };
        }

        if (shape.type === "cone") {
            const cone = shape as ConeShapeData;
            const radius = (cone.radius / size) * distance;
            const { origin, contains } = this.#coneCoverage(cone, { x: cone.x, y: cone.y });
            return {
                origin,
                searchCenter: origin,
                reach: cone.radius / size,
                contains: (destination) => contains(destination) && measureDistance(destination, origin) <= radius,
            };
        }

        // A line is a rectangle `length` long and `width` wide running from the origin along its rotation
        const line = shape as LineShapeData;
        const radians = Math.toRadians(line.rotation);
        const along = { x: Math.cos(radians), y: Math.sin(radians) };
        const perpendicular = { x: -along.y, y: along.x };
        const halfWidth = line.width / 2;
        // PF2e lines fire from a grid corner. Step the origin back to that corner along whichever axes it sits mid-cell
        const toCorner = (coord: number, component: number): number =>
            coord % size !== 0 ? coord - Math.sign(Math.round(component * 100)) * (size / 2) : coord;
        const origin = { x: toCorner(line.x, along.x), y: toCorner(line.y, along.y) };
        return {
            origin,
            searchCenter: { x: origin.x + along.x * (line.length / 2), y: origin.y + along.y * (line.length / 2) },
            reach: (line.length / 2 + halfWidth) / size,
            contains: (destination) => {
                const dx = destination.x - origin.x;
                const dy = destination.y - origin.y;
                const projection = dx * along.x + dy * along.y;
                const offset = dx * perpendicular.x + dy * perpendicular.y;
                return projection >= 0 && projection <= line.length && Math.abs(offset) <= halfWidth;
            },
        };
    }

    /**
     * Border-aligned apex and wedge test for a cone. The apex is taken as placed: the coordinate perpendicular to the
     * firing direction is left alone, which is what separates a corner-origin cone (perpendicular on a grid line) from
     * a side-origin one.
     */
    #coneCoverage(shape: ConeShapeData, origin: Point): { origin: Point; contains: (destination: Point) => boolean } {
        const dimensions = canvas.dimensions;
        const direction = shape.rotation;
        const minAngle = (360 + ((direction - shape.angle * 0.5) % 360)) % 360;
        const maxAngle = (360 + ((direction + shape.angle * 0.5) % 360)) % 360;
        const withinAngle = (value: number): boolean => {
            value = (360 + (value % 360)) % 360;
            return minAngle < maxAngle
                ? value >= minAngle && value <= maxAngle
                : value >= minAngle || value <= maxAngle;
        };

        // Offset the origin by half a cell toward the firing direction along each axis it is not already a border of.
        // `dir` is degrees anticlockwise from pointing right, in 45-degree increments from 0 to 360.
        const dir = (direction >= 0 ? 360 - direction : -direction) % 360;
        const xOffset =
            origin.x % dimensions.size !== 0 ? Math.sign(Math.round(Math.cos(Math.toRadians(dir)) * 100)) / 2 : 0;
        // Inverted along Y because screen-space Y increases downward
        const yOffset =
            origin.y % dimensions.size !== 0 ? -Math.sign(Math.round(Math.sin(Math.toRadians(dir)) * 100)) / 2 : 0;
        const coneOrigin = { x: origin.x + xOffset * dimensions.size, y: origin.y + yOffset * dimensions.size };

        return {
            origin: coneOrigin,
            contains: (destination: Point): boolean => {
                const ray = new fc.geometry.Ray(coneOrigin, destination);
                const rayAngle = (360 + ((ray.angle / (Math.PI / 180)) % 360)) % 360;
                return ray.distance === 0 || withinAngle(rayAngle);
            },
        };
    }

    override async _draw(options?: object): Promise<void> {
        await super._draw(options);
        const highlights = (this.layer as unknown as fc.layers.RegionLayer)._highlights;
        this.#blockedHighlight = highlights.addChild(new PIXI.Graphics());
        this.#drawBlockedHighlight();
    }

    /** Shade the in-range squares a wall cuts off from the origin. */
    #drawBlockedHighlight(): void {
        const graphics = this.#blockedHighlight;
        if (!graphics) return;
        graphics.clear();
        graphics.visible = this.visible;
        graphics.zIndex = this.zIndex;
        const { sizeX, sizeY } = canvas.grid;
        for (const offset of this.#blockedOffsets) {
            const { x, y } = canvas.grid.getTopLeftPoint(offset);
            graphics
                .beginFill(0x000000, 0.5)
                .drawRect(x, y, sizeX, sizeY)
                .endFill()
                .lineStyle(1, 0x000000, 0.5)
                .moveTo(x, y)
                .lineTo(x + sizeX, y + sizeY);
        }
    }

    override _applyRenderFlags(flags: Record<string, boolean>): void {
        super._applyRenderFlags(flags);
        if (flags.refreshGeometry || flags.refreshVisibility) this.#drawBlockedHighlight();
    }

    override _clear(): void {
        this.#blockedHighlight?.destroy();
        this.#blockedHighlight = null;
        super._clear();
    }

    override _destroy(options?: boolean | PIXI.IDestroyOptions): void {
        this.#blockedHighlight?.destroy();
        this.#blockedHighlight = null;
        super._destroy(options);
    }

    /** Save the coordinates of the new drop location(s). */
    protected override async _onDragLeftDrop(event: PlaceablesLayerPointerEvent<this>): Promise<TDocument[]>;
    protected override async _onDragLeftDrop(event: PlaceablesLayerPointerEvent<this>): Promise<RegionDocument[]> {
        const handle = event.interactionData.handle;
        if (handle) return handle.controls._onDragDrop(event) ?? [];
        const clones = event.interactionData.clones ?? [];
        const updates = clones.map((clone) => {
            const shapes = clone.document.shapes.map((s) => s.toObject(false));
            return { _id: clone.document.id, shapes };
        });

        return this.document.parent?.updateEmbeddedDocuments("Region", updates) ?? [];
    }
}

/** Per-shape geometry for a template's grid coverage. */
interface AreaCoverage {
    /** Point line of effect is measured from */
    origin: Point;
    /** Center of the cell-search box, in pixels */
    searchCenter: Point;
    /** Half-extent of the search box, in grid squares */
    reach: number;
    /** Whether a cell center lies within the area, before line of effect is checked */
    contains: (destination: Point) => boolean;
}

export { RegionPF2e };
