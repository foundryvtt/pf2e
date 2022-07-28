import { MeasuredTemplateDocumentPF2e } from "@module/scene/measured-template-document";
import { TemplateLayerPF2e } from ".";
import { highlightGrid } from "./helpers";

class MeasuredTemplatePF2e extends MeasuredTemplate<MeasuredTemplateDocumentPF2e> {
    get type(): MeasuredTemplateType {
        return this.data.t;
    }

    /** The highlight layer for this template */
    get highlightId(): string {
        return `Template.${this.id}`;
    }

    override highlightGrid(): void {
        if (!["circle", "cone"].includes(this.type) || canvas.scene?.data.gridType !== CONST.GRID_TYPES.SQUARE) {
            return super.highlightGrid();
        }

        highlightGrid({
            type: this.type === "circle" ? "burst" : "cone",
            object: this,
            data: this.data,
            colors: { border: this.borderColor, fill: this.fillColor },
        });
    }
}

interface MeasuredTemplatePF2e extends MeasuredTemplate<MeasuredTemplateDocumentPF2e> {
    get layer(): TemplateLayerPF2e<this>;
}

export { MeasuredTemplatePF2e };
