import type { DocumentIdField } from "@client/data/fields.mjs";
import { Point } from "@common/_types.mjs";
import { ScenePF2e } from "@scene/document.ts";
import { RegionDocumentPF2e } from "@scene/region-document/document.ts";
import { TokenDocumentPF2e } from "@scene/token-document/document.ts";
import { ErrorPF2e } from "@util";
import { RegionBehaviorPF2e } from "../document.ts";
import fields = foundry.data.fields;

const DEFAULT_DURATION = 500;

class RotateAreaBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType<
    RotateAreaTypeSchema,
    RegionBehaviorPF2e | null
> {
    static override LOCALIZATION_PREFIXES = ["PF2E.Region.RotateArea"];

    static override defineSchema(): RotateAreaTypeSchema {
        return {
            time: new fields.SchemaField({
                value: new fields.NumberField({
                    required: true,
                    nullable: false,
                    min: 0,
                    initial: DEFAULT_DURATION,
                    integer: true,
                }),
                mode: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: RotateAreaBehaviorType.SPEED_MODES,
                    initial: "fixed",
                }),
            }),
            tiles: new fields.SchemaField({
                ids: new fields.SetField(new fields.DocumentIdField()),
            }),
            walls: new fields.SchemaField({
                ids: new fields.SetField(new fields.DocumentIdField()),
                link: new fields.BooleanField({ required: true, nullable: false, initial: true }),
            }),
            lights: new fields.SchemaField({
                ids: new fields.SetField(new fields.DocumentIdField()),
            }),
            regions: new fields.SchemaField({
                ids: new fields.SetField(new fields.DocumentIdField()),
            }),
            sounds: new fields.SchemaField({
                ids: new fields.SetField(new fields.DocumentIdField()),
            }),
            notes: new fields.SchemaField({
                ids: new fields.SetField(new fields.DocumentIdField()),
            }),
            directionMode: new fields.StringField({
                required: true,
                initial: "short",
                choices: RotateAreaBehaviorType.DIRECTION_MODES,
            }),
            positions: new fields.ArrayField(
                new fields.SchemaField({
                    angle: new fields.NumberField({ required: true, nullable: false, initial: 0, min: -360, max: 360 }),
                }),
                { initial: [{ angle: 0 }] },
            ),
            status: new fields.SchemaField({
                angle: new fields.AngleField({ required: true, initial: 0 }),
                position: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
            }),
        };
    }

    /** Modes for determining rotation direction when moving to the next point. */
    static DIRECTION_MODES = Object.seal({
        cw: "PF2E.Region.RotateArea.DirectionMode.cw",
        ccw: "PF2E.Region.RotateArea.DirectionMode.ccw",
        short: "PF2E.Region.RotateArea.DirectionMode.short",
        long: "PF2E.Region.RotateArea.DirectionMode.long",
    });

    /** Modes for mapping rotation time to final speed. */
    static SPEED_MODES = Object.seal({
        fixed: "PF2E.Region.RotateArea.SpeedMode.fixed",
        variable: "PF2E.Region.RotateArea.SpeedMode.variable",
    });

    /**
     * Used to check if we are mid rotation for a behavior. If true, later rotation attempts will be ignored.
     * The behavior is not reused every update, and it seems like it can get reinstantiated. Therefore we store the record globally
     */
    static #rotating: Set<string> = new Set();

    /**
     * Rotate to the next position.
     * @param reverse Rotate to previous position instead of next one.
     * @returns Resolves once rotation is complete.
     */
    async rotate(reverse = false): Promise<boolean> {
        const index = this.status.position + (reverse ? -1 : 1);
        const clampedIndex = index >= this.positions.length ? 0 : index < 0 ? this.positions.length - 1 : index;
        return this.rotateTo({ position: clampedIndex });
    }

    /**
     * Trigger the rotator to rotate to a angle or specific position. Either the angle or position must be provided.
     * @param {object} options
     * @param {number} [options.angle]     Final angle.
     * @param {string} [options.position]  Position index to rotate to.
     * @returns Resolves once rotation is complete. Returns false if it returns early
     */
    async rotateTo({ angle: targetAngle, position }: { angle?: number; position: number }): Promise<boolean> {
        if (!this.behavior) throw ErrorPF2e("Unexpected missing parent behavior");
        if (!this.region) throw ErrorPF2e("Unexpected missing region document");
        if (!this.scene) throw ErrorPF2e(`Unexpected missing scene in region behavior \`${this.behavior.uuid}\``);
        if (RotateAreaBehaviorType.#rotating.has(this.behavior.id) || !this.behavior) return false;

        const positionData = typeof position === "number" ? this.positions.at(position) : null;
        if (typeof position === "number" && !positionData) {
            console.warn(`Invalid position \`${position}\` when attempting to rotate \`${this.behavior.uuid}\`.`);
            return false;
        }

        targetAngle ??= positionData?.angle;
        if (targetAngle === undefined) {
            console.warn(
                `No target angle or position index provided when attempting to rotate \`${this.behavior.uuid}\`.`,
            );
            return false;
        }

        // Determine rotation angle, time, and pivot point
        const angle = this.#travelAngle(this.status.angle, targetAngle);
        const radians = Math.toRadians(angle);
        const duration = Math.max(
            this.time.mode === "fixed" ? this.time.value : this.time.value * (Math.abs(angle) / 90),
            500,
        );
        const pivot = this.region.shapes[0].origin;

        const calculateRotationUpdate = (placeable: RotatableDocument) => {
            if (placeable instanceof TileDocument) {
                const shape = placeable.shape.clone();
                shape.rotate(angle, { pivot });
                return { _id: placeable.id, x: shape.x, y: shape.y, rotation: placeable.rotation + angle };
            }
            const { center, offset, rotation } = this.#getPlacementAndRotation(placeable);
            const shouldRotate =
                placeable instanceof TokenDocument
                    ? game.settings.get("core", "tokenAutoRotate") && !placeable.lockRotation
                    : true;
            return {
                _id: placeable.id,
                ...RotateAreaBehaviorType.#calculatePosition(radians, pivot, center, offset),
                rotation: rotation !== undefined && shouldRotate ? rotation + angle : rotation,
            };
        };

        // Prepare update data for each rotated document type
        const docs = this.#getAnimatables();
        const updates = {
            tiles: docs.tiles.map((t) => calculateRotationUpdate(t)),
            tokens: docs.tokens.map((t) => calculateRotationUpdate(t)),
            lights: docs.lights.map((l) => calculateRotationUpdate(l)),
            regions: docs.regions.map((r) => RotateAreaBehaviorType.#rotateRegionShapes(r, angle, pivot)),
            sounds: docs.sounds.map((s) => calculateRotationUpdate(s)),
            notes: docs.notes.map((s) => calculateRotationUpdate(s)),
            walls: docs.walls.map((wall) => {
                const first = RotateAreaBehaviorType.#calculatePosition(radians, pivot, {
                    x: wall.c[0],
                    y: wall.c[1],
                });
                const second = RotateAreaBehaviorType.#calculatePosition(radians, pivot, {
                    x: wall.c[2],
                    y: wall.c[3],
                });
                return { _id: wall.id, c: [first.x, first.y, second.x, second.y] };
            }),
        };

        // Update status to indicate rotation is occurring and trigger visible animation
        try {
            RotateAreaBehaviorType.#rotating.add(this.behavior.id);
            if (canvas.scene === this.scene) {
                this.#animateRotation(angle, pivot, duration);
                // Wait for the visible animation to complete before performing document updates
                await new Promise((resolve) => setTimeout(resolve, duration));
            }

            await foundry.documents.modifyBatch([
                {
                    action: "update",
                    documentName: "RegionBehavior",
                    updates: [{ _id: this.behavior.id, "system.status": { angle: targetAngle, position } }],
                    parent: this.region,
                },
                // Tokens must be updated before the regions so they re-enter the rotated region after they briefly leave it
                // when moved to the new position while the region shapes have not been updated yet
                {
                    action: "update",
                    documentName: "Token",
                    updates: updates.tokens,
                    parent: this.scene,
                    animate: false,
                    constrainOptions: { ignoreWalls: true, ignoreCost: true },
                },
                { action: "update", documentName: "AmbientLight", updates: updates.lights, parent: this.scene },
                { action: "update", documentName: "AmbientSound", updates: updates.sounds, parent: this.scene },
                { action: "update", documentName: "Region", updates: updates.regions, parent: this.scene },
                { action: "update", documentName: "Tile", updates: updates.tiles, parent: this.scene },
                { action: "update", documentName: "Note", updates: updates.notes, parent: this.scene },
                { action: "update", documentName: "Wall", updates: updates.walls, parent: this.scene },
            ]);
        } finally {
            RotateAreaBehaviorType.#rotating.delete(this.behavior.id);
        }

        return true;
    }

    /**
     * Calculate the final position based on a rotation.
     * @param angle Rotation amount in radians.
     * @param pivot Center point for the rotation.
     * @param center Center point for the object being rotated.
     * @param offset How offset the center point is from the stored point.
     */
    static #calculatePosition(angle: number, pivot: Point, center: Point, offset = { x: 0, y: 0 }) {
        const vector = new fc.geometry.Ray(pivot, center).shiftAngle(angle);
        return { x: vector.B.x - offset.x, y: vector.B.y - offset.y };
    }

    /** Retrieve and object with canvas documents for anything rotated. */
    #getAnimatables(): {
        tiles: fd.TileDocument<ScenePF2e>[];
        tokens: TokenDocumentPF2e<ScenePF2e>[];
        lights: fd.AmbientLightDocument<ScenePF2e>[];
        regions: RegionDocumentPF2e[];
        sounds: fd.AmbientSoundDocument<ScenePF2e>[];
        notes: fd.NoteDocument<ScenePF2e>[];
        walls: fd.WallDocument<ScenePF2e>[];
    } {
        const { scene, region } = this;
        if (!scene || !region) {
            return { tiles: [], tokens: [], lights: [], regions: [], sounds: [], notes: [], walls: [] };
        }

        const animatables = {
            tiles: Array.from(this.tiles.ids)
                .map((id) => scene.tiles.get(id ?? ""))
                .filter((d): d is fd.TileDocument<ScenePF2e> => !!d),
            tokens: Array.from(region.tokens),
            lights: Array.from(this.lights.ids)
                .map((id) => scene.lights.get(id ?? ""))
                .filter((d): d is fd.AmbientLightDocument<ScenePF2e> => !!d),
            regions: [region.id, ...this.regions.ids]
                .map((id) => scene.regions.get(id ?? ""))
                .filter((d): d is RegionDocumentPF2e<ScenePF2e> => !!d),
            sounds: Array.from(this.sounds.ids)
                .map((id) => scene.sounds.get(id ?? ""))
                .filter((d): d is fd.AmbientSoundDocument<ScenePF2e> => !!d),
            notes: Array.from(this.notes.ids)
                .map((id) => scene.notes.get(id ?? ""))
                .filter((d): d is fd.NoteDocument<ScenePF2e> => !!d),
            walls: Array.from(this.walls.ids)
                .map((id) => scene.walls.get(id ?? ""))
                .filter((d): d is fd.WallDocument<ScenePF2e> => !!d),
        };
        if (this.walls.link) {
            animatables.walls = animatables.walls.flatMap(
                (w) => w.object?.getLinkedSegments().walls.map((w) => w.document) ?? [],
            );
        }
        return animatables;
    }

    /** Retrieves center, size, and rotation for a document, handling differences bettween document types */
    #getPlacementAndRotation(doc: RotatableDocument): RotationParams {
        const center = doc instanceof TokenDocument ? doc.getCenterPoint() : { x: doc.x, y: doc.y };
        const size =
            doc instanceof TileDocument
                ? { width: doc.width, height: doc.height }
                : doc instanceof TokenDocument
                  ? doc.getSize()
                  : { width: 0, height: 0 };
        const offset = { x: size.width * 0.5, y: size.height * 0.5 };
        const rotation = "rotation" in doc ? doc.rotation : (doc.object?.rotation ?? 0);
        return { center, offset, rotation };
    }

    /**
     * Create updates needed to rotate a region's shapes.
     * @param region The region to rotate.
     * @param angle Rotation amount in degrees.
     * @param radians Rotation amount in radians.
     * @param pivot Center point for the rotation.
     * @returns Update data for the region.
     */
    static #rotateRegionShapes(region: RegionDocument, angle: number, pivot: Point) {
        return {
            _id: region.id,
            shapes: region.shapes.map((shape) => {
                const clone = shape.clone();
                clone.rotate(angle, { pivot });
                return clone.toObject();
            }),
        };
    }

    /**
     * Determine the direction to rotate and the final rotation angle based on the direction mode.
     * @param start Starting angle.
     * @param end Ending angle.
     */
    #travelAngle(start: number, end: number): number {
        if (start < 0) start += 360;
        if (end < 0) end += 360;
        const cw = (end - start + 360) % 360;
        const ccw = ((start - end + 360) % 360) * -1;
        switch (this.directionMode) {
            case "cw":
                return cw;
            case "ccw":
                return ccw;
            case "short":
                return Math.abs(cw) < Math.abs(ccw) ? cw : ccw;
            case "long":
                return Math.abs(cw) > Math.abs(ccw) ? cw : ccw;
        }
    }

    /**
     * Handle animating the rotation of the region.
     * @param {Degrees} angle
     * @param {Point} pivot
     * @param {number} duration
     */
    #animateRotation(angle: number, pivot: Point, duration: number) {
        const docs = this.#getAnimatables();

        // Get lights, tiles, and walls and animate them bit by bit
        // Sounds currently fail to animate, and notes don't need to animate
        const animatables = [...docs.lights, ...docs.tiles].map((document) => ({
            document,
            params: this.#getPlacementAndRotation(document),
        }));
        const walls = docs.walls.map((document) => ({ document, initialPoints: fu.duplicate(document.c) }));
        foundry.canvas.animation.CanvasAnimation.animate([], {
            duration,
            easing: foundry.canvas.animation.CanvasAnimation.easeInOutCosine,
            priority: PIXI.UPDATE_PRIORITY.OBJECTS + 1,
            ontick: (_, animation) => {
                const [time, duration] = [animation.time ?? 0, animation.duration ?? DEFAULT_DURATION];
                const percent = time >= duration ? 1 : time / duration;
                if (percent > 1) return;

                const easingFunction = typeof animation.easing === "function" ? animation.easing : null;
                const percentEased = easingFunction?.(percent) ?? percent;
                const adjustedAngle = Math.toRadians(angle * percentEased);
                for (const { document, params } of animatables) {
                    const { center, offset, rotation } = params;
                    if (document instanceof TileDocument) {
                        const shape = document.shape.clone();
                        shape.rotate(angle * percentEased, { pivot });
                        const updates = { x: shape.x, y: shape.y, rotation: rotation + angle * percentEased };
                        Object.assign(document.shape, updates);
                    } else {
                        const updates = RotateAreaBehaviorType.#calculatePosition(adjustedAngle, pivot, center, offset);
                        document.x = updates.x;
                        document.y = updates.y;
                        if (document instanceof AmbientLightDocument) {
                            document.rotation = rotation + angle * percentEased;
                        }
                    }

                    if (document instanceof AmbientLightDocument) {
                        document.object?.initializeLightSource();
                    } else if (document instanceof TileDocument) {
                        document.object?.renderFlags.set({ refreshTransform: true });
                    }
                }
                for (const { document, initialPoints } of walls) {
                    const first = RotateAreaBehaviorType.#calculatePosition(adjustedAngle, pivot, {
                        x: initialPoints[0],
                        y: initialPoints[1],
                    });
                    const second = RotateAreaBehaviorType.#calculatePosition(adjustedAngle, pivot, {
                        x: initialPoints[2],
                        y: initialPoints[3],
                    });
                    document.c = [first.x, first.y, second.x, second.y];
                    document.object?.renderFlags.set({ refreshLine: true });
                    if (game.settings.get("core", "visionAnimation")) document.initializeEdge();
                }
            },
        });

        // Tokens have their own animation function we need to call
        const rad = Math.toRadians(angle);
        for (const token of docs.tokens) {
            const { center, offset, rotation } = this.#getPlacementAndRotation(token);
            const finalPosition = RotateAreaBehaviorType.#calculatePosition(rad, pivot, center, offset);
            const shouldRotate = game.settings.get("core", "tokenAutoRotate") && !token.lockRotation;
            token.object?.animate(finalPosition, {
                duration,
                easing: foundry.canvas.animation.CanvasAnimation.easeInOutCosine,
                ontick: (_elapsedMS, animation, data) => {
                    const [time, duration] = [animation.time ?? 0, animation.duration ?? DEFAULT_DURATION];
                    const percent = time >= duration ? 1 : time / duration;
                    const easingFunction = typeof animation.easing === "function" ? animation.easing : null;
                    const percentEased = easingFunction?.(percent) ?? percent;
                    const adjustedAngle = Math.toRadians(angle * percentEased);
                    const updates = RotateAreaBehaviorType.#calculatePosition(adjustedAngle, pivot, center, offset);
                    data.x = updates.x;
                    data.y = updates.y;
                    if (shouldRotate) data.rotation = rotation + angle * percentEased;
                },
            });
        }
    }
}

/** Documents that can be rotated normally. Walls need special handling */
type RotatableDocument =
    | fd.TileDocument<ScenePF2e>
    | AmbientLightDocument<ScenePF2e>
    | AmbientSoundDocument<ScenePF2e>
    | TokenDocumentPF2e<ScenePF2e>
    | NoteDocument<ScenePF2e>;

interface RotationParams {
    center: Point;
    offset: Point;
    rotation: number;
}

type RotateAreaBehavior = RegionBehaviorPF2e<RegionDocumentPF2e, RotateAreaBehaviorType>;

interface RotateAreaBehaviorType
    extends
        foundry.data.regionBehaviors.RegionBehaviorType<RotateAreaTypeSchema, RegionBehaviorPF2e | null>,
        fields.ModelPropsFromSchema<RotateAreaTypeSchema> {}

type RotateAreaSpeedMode = keyof (typeof RotateAreaBehaviorType)["SPEED_MODES"];
type RotateAreaDirectionMode = keyof (typeof RotateAreaBehaviorType)["DIRECTION_MODES"];

type RotateAreaTypeSchema = {
    time: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        mode: fields.StringField<RotateAreaSpeedMode, RotateAreaSpeedMode, true, false, true>;
    }>;
    tiles: fields.SchemaField<{
        ids: fields.SetField<DocumentIdField>;
    }>;
    walls: fields.SchemaField<{
        ids: fields.SetField<DocumentIdField>;
        link: fields.BooleanField<boolean, boolean, true, false, true>;
    }>;
    lights: fields.SchemaField<{
        ids: fields.SetField<DocumentIdField>;
    }>;
    regions: fields.SchemaField<{
        ids: fields.SetField<DocumentIdField>;
    }>;
    sounds: fields.SchemaField<{
        ids: fields.SetField<DocumentIdField>;
    }>;
    notes: fields.SchemaField<{
        ids: fields.SetField<DocumentIdField>;
    }>;
    directionMode: fields.StringField<RotateAreaDirectionMode, RotateAreaDirectionMode, true, false, true>;
    positions: fields.ArrayField<
        fields.SchemaField<{
            angle: fields.NumberField<number, number, true, false, true>;
        }>
    >;
    status: fields.SchemaField<{
        angle: fields.AngleField<true, false, true>;
        position: fields.NumberField<number, number, true, false, true>;
    }>;
};

export { RotateAreaBehaviorType };
export type { RotateAreaBehavior };
