import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import type { EffectAreaShape } from "@item/spell/types.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { MeasuredTemplateDocumentPF2e, ScenePF2e } from "@scene";
import { highlightGrid } from "./helpers.ts";
import type { TemplateLayerPF2e } from "./index.ts";

class MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>,
> extends MeasuredTemplate<TDocument> {
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
    get snappingMode(): number {
        const M = CONST.GRID_SNAPPING_MODES;
        switch (this.areaShape) {
            case "burst":
                return M.CORNER;
            case "emanation":
                return M.CENTER;
            case "cone":
                return M.CENTER | M.CORNER | M.SIDE_MIDPOINT;
            default:
                return M.CENTER | M.CORNER;
        }
    }

    override highlightGrid(): void {
        const isCircleOrCone = ["circle", "cone"].includes(this.document.t);
        const hasSquareGrid = canvas.grid.type === CONST.GRID_TYPES.SQUARE;
        if (!isCircleOrCone || !hasSquareGrid) {
            return super.highlightGrid();
        }

        // Refrain from highlighting if not visible
        if (!this.isVisible) {
            canvas.interface.grid.getHighlightLayer(this.highlightId)?.clear();
            return;
        }

        highlightGrid({
            areaShape: this.areaShape,
            object: this,
            document: this.document,
            colors: { border: Number(this.document.borderColor), fill: Number(this.document.fillColor) },
            preview: true,
        });
    }
}

interface MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>,
> extends MeasuredTemplate<TDocument> {
    get layer(): TemplateLayerPF2e<this>;
}

export { MeasuredTemplatePF2e };
