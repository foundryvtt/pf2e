import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import type { EffectAreaType } from "@item/spell/types.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { MeasuredTemplateDocumentPF2e, ScenePF2e } from "@scene";
import { tupleHasValue } from "@util";
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

    get areaType(): EffectAreaType | null {
        return this.document.areaType;
    }

    /** Set the template layer's grid precision appropriately for this measured template's shape. */
    snapForShape(): void {
        this.layer.snapFor(this.areaType);
    }

    override highlightGrid(): void {
        const isCircleOrCone = ["circle", "cone"].includes(this.document.t);
        const hasSquareGrid = canvas.grid.type === CONST.GRID_TYPES.SQUARE;
        if (!isCircleOrCone || !hasSquareGrid) {
            return super.highlightGrid();
        }

        // Refrain from highlighting if not visible
        if (!this.isVisible) {
            canvas.grid.getHighlightLayer(this.highlightId)?.clear();
            return;
        }

        this.snapForShape();
        highlightGrid({
            areaType: tupleHasValue(["burst", "cone", "emanation"], this.areaType) ? this.areaType : "burst",
            object: this,
            document: this.document,
            colors: { border: this.borderColor, fill: this.fillColor },
            preview: true,
        });
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _onDragLeftDrop(event: PlaceablesLayerPointerEvent<this>): Promise<void | TDocument[]> {
        this.snapForShape();
        return super._onDragLeftDrop(event);
    }
}

interface MeasuredTemplatePF2e<
    TDocument extends MeasuredTemplateDocumentPF2e<ScenePF2e | null> = MeasuredTemplateDocumentPF2e<ScenePF2e | null>,
> extends MeasuredTemplate<TDocument> {
    get layer(): TemplateLayerPF2e<this>;
}

export { MeasuredTemplatePF2e };
