import { MapLocationControlIcon } from "@module/canvas/map-location-control-icon.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { JournalEntryPageSource } from "types/foundry/common/documents/journal-entry-page.js";

interface JournalEntryPagePF2eSystemSchema extends JournalEntryPageSource {
    code: StringField<string, string, false, false, true>;
}

class JournalEntryPagePF2e extends JournalEntryPage {
    static override defineSchema(): JournalEntryPagePF2eSystemSchema {
        const superFields = super.defineSchema();
        const fields = foundry.data.fields;
        return {
            ...superFields,
            code: new fields.StringField(),
        };
    }

    /**
     * Adjust the number of this entry in the table of contents.
     * @param {number} number  Current position number.
     */
    adjustTOCNumbering(): { number: string; adjustment: number } | void {
        if (!this.system.code) return;
        return { number: this.system.code, adjustment: -1 };
    }

    /**
     * Create a control icon for rendering this page on a scene.
     * @param {object} options  Options passed through to ControlIcon construction.
     */
    getControlIcon(options: object): PIXI.Container | void {
        const style = foundry.utils.mergeObject(
            CONFIG.PF2E.mapLocationMarker.default,
            CONFIG.PF2E.mapLocationMarker[this.parent.getFlag("pf2e", "mapMarkerStyle")] ?? {},
            { inplace: false },
        );
        return new MapLocationControlIcon({ code: this.system.code, ...options, ...style });
    }
}

export { JournalEntryPagePF2e };
