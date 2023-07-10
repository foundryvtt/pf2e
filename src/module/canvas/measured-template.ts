import { MeasuredTemplateDocumentPF2e } from "@scene/measured-template-document.ts";
import { TemplateLayerPF2e, TokenPF2e } from "./index.ts";
import { highlightGrid } from "./helpers.ts";
import { ScenePF2e } from "@scene/index.ts";
import { ItemPF2e } from "@item";
import { ActorPF2e } from "@actor";

class MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>
> extends MeasuredTemplate<TDocument> {
    /** Static data for the currently active preview template */
    static currentPreview: PreviewData | null = null;

    /** Track the timestamp when the last mouse move event was captured. */
    #moveTime = 0;

    // Workaround for https://github.com/microsoft/TypeScript/issues/32912
    #wheelListenerOptions: AddEventListenerOptions & EventListenerOptions = { passive: false };

    get type(): MeasuredTemplateType {
        return this.document.t;
    }

    override highlightGrid(): void {
        if (!["circle", "cone"].includes(this.type) || canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
            return super.highlightGrid();
        }

        // Refrain from highlighting if not visible
        if (!this.isVisible) {
            canvas.grid.getHighlightLayer(this.highlightId)?.clear();
            return;
        }

        highlightGrid({
            areaType: this.type === "circle" ? "burst" : "cone",
            object: this,
            document: this.document,
            colors: { border: this.borderColor, fill: this.fillColor },
            preview: true,
        });
    }

    async drawPreview(): Promise<MeasuredTemplatePF2e | null> {
        this.layer.activate();
        await this.draw();
        this.layer.preview.addChild(this);

        canvas.stage.on("mousemove", this.#onPreviewMouseMove);
        canvas.stage.on("mousedown", this.#onPreviewLeftClick);
        canvas.stage.on("rightdown", this.#onPreviewRightClick);
        canvas.app.view.addEventListener?.("wheel", this.#onPreviewMouseWheel, this.#wheelListenerOptions);

        // Resolve existing preview
        MeasuredTemplatePF2e.currentPreview?.resolve(null);

        return new Promise((res) => {
            MeasuredTemplatePF2e.currentPreview = {
                resolve: (value) => {
                    res(value);
                    MeasuredTemplatePF2e.currentPreview = null;
                },
                placed: false,
            };
        });
    }

    /** Overriden to ensure preview canvas events are removed (if any) on destruction */
    override destroy(options?: boolean | PIXI.IDestroyOptions): void {
        canvas.stage.off("mousemove", this.#onPreviewMouseMove);
        canvas.stage.off("mousedown", this.#onPreviewLeftClick);
        canvas.stage.off("rightdown", this.#onPreviewRightClick);
        canvas.app.view.removeEventListener?.("wheel", this.#onPreviewMouseWheel, this.#wheelListenerOptions);
        super.destroy(options);
    }

    override applyRenderFlags(): void {
        super.applyRenderFlags();

        // Resolve preview Promise after the new template has been fully drawn
        if (MeasuredTemplatePF2e.currentPreview?.placed) {
            MeasuredTemplatePF2e.currentPreview.resolve(this);
        }
    }

    #onPreviewMouseMove = (event: PIXI.FederatedPointerEvent) => {
        event.stopPropagation();
        const now = Date.now();
        if (now - this.#moveTime <= 20) return;
        const center = event.getLocalPosition(this.layer);
        const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
        const hexTypes: number[] = [CONST.GRID_TYPES.HEXODDR, CONST.GRID_TYPES.HEXEVENR];
        const direction =
            this.#moveTime === 0 && hexTypes.includes(canvas.grid.type)
                ? this.document.direction + 30
                : this.document.direction;
        this.document.updateSource({ ...snapped, direction });

        this.refresh();
        this.#moveTime = now;
    };

    #onPreviewLeftClick = () => {
        if (canvas.scene) {
            canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [this.document.toObject()]).then(() => {
                if (MeasuredTemplatePF2e.currentPreview) {
                    // Set the preview as placed. The Promise will resolve after the new template was drawn on the canvas
                    MeasuredTemplatePF2e.currentPreview.placed = true;
                }
            });
        }

        canvas.tokens.activate();
        this.destroy();
    };

    #onPreviewRightClick = () => {
        canvas.tokens.activate();
        this.destroy();

        // Reset current preview data
        MeasuredTemplatePF2e.currentPreview?.resolve(null);
    };

    #onPreviewMouseWheel = (event: Event) => {
        if (!(event instanceof WheelEvent)) return;

        if (event.ctrlKey) {
            event.preventDefault();
            event.stopPropagation();
            const snap = event.shiftKey ? 15 : 5;
            this.document.updateSource({ direction: this.document.direction + snap * Math.sign(event.deltaY) });
            this.refresh();
        } else if (event.shiftKey) {
            event.stopPropagation();
            const snap =
                canvas.grid.type >= CONST.GRID_TYPES.HEXODDR && canvas.grid.type <= CONST.GRID_TYPES.HEXEVENQ ? 60 : 45;
            this.document.updateSource({ direction: this.document.direction + snap * Math.sign(event.deltaY) });
            this.refresh();
        }
    };

    get item(): ItemPF2e<ActorPF2e> | null {
        return this.document.item;
    }

    getTokens({ collisionOrigin, collisionType = "move" }: GetTokensParams = {}): TokenPF2e[] {
        if (!canvas.scene) return [];
        const { grid, dimensions } = canvas;
        if (!(grid && dimensions)) return [];

        const gridHighlight = grid.getHighlightLayer(this.highlightId);
        if (!gridHighlight || grid.type !== CONST.GRID_TYPES.SQUARE) return [];
        const origin = collisionOrigin ?? this.center;

        // Get all the tokens that are inside the highlight bounds
        const tokens = canvas.tokens.quadtree.getObjects(gridHighlight.getLocalBounds(undefined, true));

        const containedTokens: TokenPF2e[] = [];
        for (const token of tokens) {
            const tokenDoc = token.document;

            // Collect the position of all grid squares that this token occupies as "x.y"
            const tokenPositions: string[] = [];
            for (let h = 0; h < tokenDoc.height; h++) {
                const y = token.y + h * grid.size;
                tokenPositions.push(`${token.x}.${y}`);
                if (tokenDoc.width > 1) {
                    for (let w = 1; w < tokenDoc.width; w++) {
                        tokenPositions.push(`${token.x + w * grid.size}.${y}`);
                    }
                }
            }

            for (const position of tokenPositions) {
                // Check if a position exists within this GridHiglight
                if (!gridHighlight.positions.has(position)) {
                    continue;
                }
                // Position of cell's top-left corner, in pixels
                const [gx, gy] = position.split(".").map((s) => Number(s));
                // Position of cell's center in pixels
                const destination = {
                    x: gx + dimensions.size * 0.5,
                    y: gy + dimensions.size * 0.5,
                };
                if (destination.x < 0 || destination.y < 0) continue;

                const hasCollision =
                    canvas.ready &&
                    collisionType &&
                    CONFIG.Canvas.polygonBackends[collisionType].testCollision(origin, destination, {
                        type: collisionType,
                        mode: "any",
                    });

                if (!hasCollision) {
                    containedTokens.push(token);
                    break;
                }
            }
        }
        return containedTokens;
    }
}

interface GetTokensParams {
    /** The point to test collison from. Defaults to the template center */
    collisionOrigin?: Point;
    /** The collision type to check. Defaults to `move`. Can be set to `null` to disable. */
    collisionType?: WallRestrictionType | null;
}

interface PreviewData {
    resolve: (value: MeasuredTemplatePF2e | null) => void;
    placed: boolean;
}

interface MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>
> extends MeasuredTemplate<TDocument> {
    get layer(): TemplateLayerPF2e<this>;
}

export { MeasuredTemplatePF2e };
