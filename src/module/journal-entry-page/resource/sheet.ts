import { ResourcePagePF2e } from ".";
import { ResourcePageSheetData } from "../sheet/data-types";
import { JournalPageSheetPF2e } from "../sheet/base";
import { EnrichHTMLOptionsPF2e } from "@system/text-editor";

export class ResourcePageSheetPF2e extends JournalPageSheetPF2e<ResourcePagePF2e> {
    override get template(): string {
        return `systems/pf2e/templates/journal/page-resource-${this.isEditable ? "edit" : "view"}.hbs`;
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ResourcePageSheetData> {
        const sheetData = (await super.getData(options)) as ResourcePageSheetData;

        sheetData.editor = {
            engine: "tinymce",
            collaborate: true,
            content: await TextEditor.enrichHTML(sheetData.data.text.content || "", {
                relativeTo: this.object,
                secrets: this.object.isOwner,
                async: true,
            } as EnrichHTMLOptionsPF2e),
        };
        const thresholds = [...this.document.system.thresholds];
        sheetData.sortedThresholds = thresholds?.sort((a, b) => {
            return b.value - a.value;
        });
        const currentThreshold = sheetData.sortedThresholds?.find((threshold) => {
            return threshold.value <= this.document.system.value;
        });
        sheetData.currentThreshold = currentThreshold?.label || "";
        sheetData.sortedThresholds?.reverse();
        return sheetData;
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // add buttons for default thresholds, resources, and thresholds on a resource
        html.querySelector("a.add-threshold")?.addEventListener("click", async () => {
            await this.submit({ preventClose: true, preventRender: false });
            const thresholds = this.document.system.thresholds || [];
            thresholds.push({ value: 0, label: "New Threshold" });
            await this.document.update({ system: { thresholds } });
            this.render();
        });

        for (const thresholdDeleteButton of html.querySelectorAll<HTMLLinkElement>(".delete-threshold")) {
            thresholdDeleteButton.addEventListener("click", async () => {
                await this.submit({ preventClose: true, preventRender: false });
                const thresholds = this.document.system.thresholds || [];
                const thresholdIndex = thresholdDeleteButton
                    .closest("[data-threshold-index]")
                    ?.getAttribute("data-threshold-index");
                thresholds.splice(Number(thresholdIndex), 1);
                await this.document.update({ system: { thresholds } });
                this.render();
            });
        }

        // editing threshold values and names
        for (const thresholdValueForm of html.querySelectorAll<HTMLFormElement>(".threshold-array-value")) {
            thresholdValueForm?.addEventListener("change", () => {
                const thresholds = this.document.system.thresholds || [];
                const thresholdIndex = thresholdValueForm
                    .closest("[data-threshold-index]")
                    ?.getAttribute("data-threshold-index");
                const value = Number(thresholdValueForm.valueAsNumber);
                thresholds[Number(thresholdIndex)].value = value;
                this.document.update({ system: { thresholds } });
            });
        }

        for (const thresholdLabelForm of html.querySelectorAll<HTMLFormElement>(".threshold-array-label")) {
            thresholdLabelForm?.addEventListener("change", () => {
                const thresholds = this.document.system.thresholds || [];
                const thresholdIndex = thresholdLabelForm
                    .closest("[data-threshold-index]")
                    ?.getAttribute("data-threshold-index");
                const value = thresholdLabelForm.value || "";
                thresholds[Number(thresholdIndex)].label = value;
                this.document.update({ system: { thresholds } });
            });
        }

        for (const resourceValueForm of html.querySelectorAll<HTMLFormElement>(".resource-value")) {
            resourceValueForm?.addEventListener("change", async () => {
                const change = Number(resourceValueForm.value);
                await this.submit({ preventClose: true, preventRender: false });
                const value = Math.clamped(change, this.document.system.min, this.document.system.max ?? 0);
                await this.document.update({ system: { value } });
                this.render();
            });
        }

        for (const reduceResourceValue of html.querySelectorAll<HTMLFormElement>(".reduce-resource-value")) {
            reduceResourceValue?.addEventListener("click", async () => {
                const change = this.document.system.value - 1;
                await this.submit({ preventClose: true, preventRender: false });
                const value = Math.clamped(change, this.document.system.min, this.document.system.max ?? 0);
                await this.document.update({ system: { value } });
                this.render();
            });
        }

        for (const increaseResourceValue of html.querySelectorAll<HTMLFormElement>(".increase-resource-value")) {
            increaseResourceValue?.addEventListener("click", async () => {
                const change = this.document.system.value + 1;
                await this.submit({ preventClose: true, preventRender: false });
                const value = Math.clamped(change, this.document.system.min, this.document.system.max ?? 0);
                await this.document.update({ system: { value } });
                this.render();
            });
        }
    }
}
