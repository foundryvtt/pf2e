import { MapLocationControlIcon } from "@module/canvas/map-location-control-icon.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";

type JournalMapLocationPageSystemSchema = {
    code: StringField<string, string, false, false, true>;
};

class JournalMapLocationPageSystemData extends foundry.abstract.TypeDataModel<
    JournalEntryPage,
    JournalMapLocationPageSystemSchema
> {
    static override defineSchema(): JournalMapLocationPageSystemSchema {
        const fields = foundry.data.fields;
        return {
            code: new fields.StringField(),
        };
    }

    /**
     * Adjust the number of this entry in the table of contents.
     * @param {number} number  Current position number.
     */
    adjustTOCNumbering(): { number: string; adjustment: number } | void {
        if (!this.code) return;
        return { number: this.code, adjustment: -1 };
    }

    /**
     * Create a control icon for rendering this page on a scene.
     * @param {object} options  Options passed through to ControlIcon construction.
     */
    getControlIcon(options: object): PIXI.Container | void {
        if (!this.code) return;
        const style = foundry.utils.mergeObject(
            CONFIG.PF2E.mapLocationMarker.default,
            CONFIG.PF2E.mapLocationMarker[this.parent.getFlag("pf2e", "mapMarkerStyle")] ?? {},
            { inplace: false },
        );
        return new MapLocationControlIcon({ code: this.code, ...options, ...style });
    }
}

export { JournalMapLocationPageSystemData };
