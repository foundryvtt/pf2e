import { MeasuredTemplateDocumentPF2e } from "@scene/measured-template-document.ts";
import { TemplateLayerPF2e } from "./index.ts";
import { highlightGrid } from "./helpers.ts";
import { ScenePF2e } from "@scene/index.ts";
import { ItemPF2e } from "@item";
import { ActorPF2e } from "@actor";

class MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>,
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
}

interface PreviewData {
    resolve: (value: MeasuredTemplatePF2e | null) => void;
    placed: boolean;
}

interface MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>,
> extends MeasuredTemplate<TDocument> {
    get layer(): TemplateLayerPF2e<this>;
}

export { MeasuredTemplatePF2e };
