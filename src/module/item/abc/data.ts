import type { ImageFilePath } from "@common/constants.d.mts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import { ItemSystemData, ItemSystemSource } from "@item/base/data/system.ts";
import fields = foundry.data.fields;

interface ABCFeatureEntryData {
    uuid: string;
    img: ImageFilePath;
    name: string;
    level: number;
}

interface ABCSystemSource extends ItemSystemSource {
    items: Record<string, ABCFeatureEntryData>;
}

interface ABCSystemData extends Omit<ABCSystemSource, "description">, ItemSystemData {}

type ABCFeatureEntrySchema = {
    uuid: fields.DocumentUUIDField<ItemUUID, true, false>;
    img: fields.FilePathField<ImageFilePath, ImageFilePath, true, false>;
    name: fields.StringField<string, string, true, false>;
    level: fields.NumberField<number, number, true, false>;
};

class ABCFeatureEntryField extends fields.SchemaField<ABCFeatureEntrySchema> {
    constructor() {
        super({
            uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
            img: new fields.FilePathField({ categories: ["IMAGE"], required: true, nullable: false }),
            name: new fields.StringField({ required: true, nullable: false }),
            level: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0 }),
        });
    }
}

export { ABCFeatureEntryField };
export type { ABCFeatureEntryData, ABCSystemData, ABCSystemSource };
