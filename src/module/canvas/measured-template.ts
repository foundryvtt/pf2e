import type { ActorPF2e } from "@actor";
import type { Point } from "@common/_types.d.mts";
import { GridSnappingMode } from "@common/constants.mjs";
import type { ItemPF2e } from "@item";
import type { EffectAreaShape } from "@item/types.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { MeasuredTemplateDocumentPF2e, ScenePF2e } from "@scene";
import { measureDistance } from "./helpers.ts";
import type { TemplateLayerPF2e } from "./layer/template.ts";

class MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>,
> extends fc.placeables.MeasuredTemplate<TDocument> {
    get actor(): ActorPF2e | null {
        return this.document.actor;
    }

    get item(): ItemPF2e | null {
        return this.document.item;
    }

    get message(): ChatMessagePF2e | null {
        return this.document.message;
    }

    get areaShape(): EffectAreaShape | null {
        return this.document.areaShape;
    }

    /**
     * Returns the snapping for this template's highlight.
     * Note that circle templates created via the canvas controls are neither bursts nor emanations, and thus can go in either position.
     */
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

    override highlightGrid(): void {
        // Only square grids use this override
        if (!canvas.grid.isSquare) return super.highlightGrid();

        const grid = canvas.interface.grid;
        const highlightLayer = grid.getHighlightLayer(this.highlightId);
        highlightLayer?.clear();

        // Refrain from highlighting if not visible
        if (!this.isVisible || !highlightLayer) {
            return;
        }

        const dimensions = canvas.dimensions;
        const positions = this._getGridHighlightPositions();
        for (const point of positions) {
            if (point.collision) {
                grid.highlightPosition(this.highlightId, {
                    x: point.x,
                    y: point.y,
                    border: 0x000001,
                    color: 0x000000,
                });
                highlightLayer
                    .beginFill(0x000000, 0.5)
                    .moveTo(point.x, point.y)
                    .lineTo(point.x + dimensions.size, point.y + dimensions.size)
                    .endFill();
            } else {
                grid.highlightPosition(this.highlightId, {
                    x: point.x,
                    y: point.y,
                    border: this.document.borderColor,
                    color: this.document.fillColor,
                });
            }
        }
    }

    /** Overriden to also return collision information */
    protected override _getGridHighlightPositions(): PointCollision[] {
        const isCircleOrCone = ["circle", "cone"].includes(this.document.t);
        if (!isCircleOrCone || !canvas.grid.isSquare) {
            return super._getGridHighlightPositions();
        }

        const areaShape = this.areaShape;
        const document = this.document;

        // Only highlight for objects that are non-previews (have IDs)
        if (!this.id && !this.isPreview) return [];

        const dimensions = canvas.dimensions;
        const grid = canvas.interface.grid;
        if (!(grid && dimensions)) return [];

        // Set data defaults
        const angle = document.angle ?? 0;
        const direction = document.direction ?? 45;

        const center = canvas.grid.getCenterPoint({ x: document.x, y: document.y });
        const { i: col0, j: row0 } = canvas.grid.getOffset({ x: center.x, y: center.y });

        const minAngle = (360 + ((direction - angle * 0.5) % 360)) % 360;
        const maxAngle = (360 + ((direction + angle * 0.5) % 360)) % 360;
        const snappedOrigin = canvas.grid.getSnappedPoint(
            { x: document.x, y: document.y },
            { mode: this.snappingMode },
        );
        const withinAngle = (min: number, max: number, value: number) => {
            min = (360 + (min % 360)) % 360;
            max = (360 + (max % 360)) % 360;
            value = (360 + (value % 360)) % 360;

            if (min < max) return value >= min && value <= max;
            return value >= min || value <= max;
        };

        // Offset measurement for cones to ensure that cones only start measuring from cell borders
        const coneOriginOffset = ((): Point => {
            if (areaShape !== "cone") return { x: 0, y: 0 };

            // Degrees anticlockwise from pointing right. In 45-degree increments from 0 to 360
            const dir = (direction >= 0 ? 360 - direction : -direction) % 360;
            // If we're not on a border for X, offset by 0.5 or -0.5 to the border of the cell in the direction we're looking on X axis
            const xOffset =
                snappedOrigin.x % dimensions.size !== 0
                    ? Math.sign((1 * Math.round(Math.cos(Math.toRadians(dir)) * 100)) / 100) / 2
                    : 0;
            // Same for Y, but cos Y goes down on screens, we invert
            const yOffset =
                snappedOrigin.y % dimensions.size !== 0
                    ? -Math.sign((1 * Math.round(Math.sin(Math.toRadians(dir)) * 100)) / 100) / 2
                    : 0;
            return { x: xOffset * dimensions.size, y: yOffset * dimensions.size };
        })();

        // Point we are measuring distances from
        const padding = Math.clamp(document.width ?? 0, 1.5, 2);
        const docDistance = document.distance ?? 0;
        const padded = (docDistance * padding) / dimensions.distance;
        const rowCount = Math.ceil(padded / (dimensions.size / canvas.grid.sizeX));
        const columnCount = Math.ceil(padded / (dimensions.size / canvas.grid.sizeY));

        const pointSource = new foundry.canvas.sources.PointMovementSource({ object: this });
        const points: PointCollision[] = [];
        for (let a = -columnCount; a < columnCount; a++) {
            for (let b = -rowCount; b < rowCount; b++) {
                // Position of cell's top-left corner, in pixels
                const { x: gx, y: gy } = canvas.grid.getTopLeftPoint({ i: col0 + a, j: row0 + b });
                // Position of cell's center in pixels
                const destination = {
                    x: gx + dimensions.size * 0.5,
                    y: gy + dimensions.size * 0.5,
                };
                if (destination.x < 0 || destination.y < 0) continue;

                // Determine point of origin
                const origin = {
                    x: snappedOrigin.x + coneOriginOffset.x,
                    y: snappedOrigin.y + coneOriginOffset.y,
                };

                if (areaShape === "cone") {
                    const ray = new fc.geometry.Ray(origin, destination);
                    const rayAngle = (360 + ((ray.angle / (Math.PI / 180)) % 360)) % 360;
                    if (ray.distance > 0 && !withinAngle(minAngle, maxAngle, rayAngle)) {
                        continue;
                    }
                }

                // Determine grid-square point to which we're measuring the distance
                const distance = measureDistance(destination, origin);
                if (distance > docDistance) continue;

                const collision =
                    canvas.ready &&
                    CONFIG.Canvas.polygonBackends.move.testCollision(origin, destination, {
                        type: "move",
                        source: pointSource,
                        mode: "any",
                    });

                points.push({ x: gx, y: gy, collision });
            }
        }

        return points;
    }
}

interface MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>,
> extends fc.placeables.MeasuredTemplate<TDocument> {
    get layer(): TemplateLayerPF2e<this>;
}

interface PointCollision extends Point {
    collision?: boolean;
}

export { MeasuredTemplatePF2e };
