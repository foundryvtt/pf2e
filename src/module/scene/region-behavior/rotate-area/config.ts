import type { FormNode } from "@client/applications/_module.mjs";
import { DocumentSheetRenderContext } from "@client/applications/api/document-sheet.mjs";
import { DataField } from "@common/data/fields.mjs";
import { htmlClosest } from "@util";
import * as R from "remeda";
import { RotateAreaBehavior } from "./behavior.ts";

class RotateAreaConfig extends foundry.applications.sheets.RegionBehaviorConfig<RotateAreaBehavior> {
    static override DEFAULT_OPTIONS = {
        actions: {
            addPosition: RotateAreaConfig.#onAddPosition,
            deletePosition: RotateAreaConfig.#onDeletePosition,
            rotateToPosition: RotateAreaConfig.#onRotateToPosition,
        },
        classes: ["rotate-area"],
    };

    /** @override */
    static override PARTS = {
        form: {
            template: `systems/${SYSTEM_ID}/templates/scene/rotate-area-config.hbs`,
            scrollable: [""],
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    };

    protected override async _prepareContext(options: fa.api.DocumentSheetRenderOptions): Promise<object> {
        const context = (await super._prepareContext(options)) as DocumentSheetRenderContext<RotateAreaBehavior>;
        const positions: PositionSheetData[] = this.document.system._source.positions.map((data, index) => ({
            data,
            fields: this.document.system.schema.fields.positions.element.fields,
            label: `#${index}`,
        }));
        return {
            ...context,
            positions,
        };
    }

    protected override _getFields(): FormNode[] {
        const fields = super._getFields();
        for (const fieldset of fields) {
            fieldset.fields = fieldset.fields?.filter((f) => !f.field?.fieldPath.startsWith("system.status"));
        }
        return fields;
    }

    /** Overriden to convert uuids to ids */
    protected override _onChangeForm(formConfig: fa.ApplicationFormConfiguration, event: Event): void {
        super._onChangeForm(formConfig, event);
        const props = ["tiles", "walls", "lights", "regions", "sounds", "notes"];
        for (const p of props) {
            const element = this.form?.elements.namedItem(`system.${p}.ids`);
            if (!(element instanceof foundry.applications.elements.HTMLStringTagsElement)) continue;
            const newValue = element.value
                .map((v) => {
                    if (!v.includes(".")) return v; // not a uuid
                    return foundry.utils.parseUuid(v)?.id;
                })
                .filter((v): v is string => !!v);

            // Replace if value changed. Test for equality to prevent infinite on change form loop
            if (!R.isShallowEqual(element.value, newValue)) element.value = newValue;
        }
    }

    static async #onAddPosition(this: RotateAreaConfig) {
        await this.submit();
        const positions = this.document.system.toObject().positions ?? [];
        if (positions.length > 1) {
            const last = positions.at(-1)?.angle ?? 0;
            const secondToLast = positions.at(-2)?.angle ?? 0;
            this.document.update({ "system.positions": [...positions, { angle: last * 2 - secondToLast }] });
        } else {
            const angle = positions[0] ? positions[0].angle + 90 : 0;
            this.document.update({ "system.positions": [...positions, { angle }] });
        }
    }

    static async #onDeletePosition(this: RotateAreaConfig, _event: Event, target: HTMLElement) {
        await this.submit();
        const position = Number(htmlClosest(target, "[data-index]")?.dataset.index);
        this.document.update({ "system.positions": this.document.system.toObject().positions.toSpliced(position, 1) });
    }

    static async #onRotateToPosition(this: RotateAreaConfig, _event: Event, target: HTMLElement) {
        await this.submit();
        const position = Number(htmlClosest(target, "[data-index]")?.dataset.index);
        this.document.system.rotateTo({ position });
    }
}

interface PositionSheetData {
    data: { angle: number };
    fields: Record<string, DataField>;
    label: string;
}

export { RotateAreaConfig };
