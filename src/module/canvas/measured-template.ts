import { MeasuredTemplateDocumentPF2e } from "@module/scene/measured-template-document";
import { TemplateLayerPF2e } from ".";
import { highlightGrid } from "./helpers";

class MeasuredTemplatePF2e extends MeasuredTemplate<MeasuredTemplateDocumentPF2e> {
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
            type: this.type === "circle" ? "burst" : "cone",
            object: this,
            document: this.document,
            colors: { border: this.borderColor, fill: this.fillColor },
        });
    }
}

interface MeasuredTemplatePF2e extends MeasuredTemplate<MeasuredTemplateDocumentPF2e> {
    get layer(): TemplateLayerPF2e<this>;
}

export { MeasuredTemplatePF2e };
