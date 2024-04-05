import { ItemSystemData, ItemSystemSource } from "@item/base/data/system.ts";

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

export type { ABCFeatureEntryData, ABCSystemData, ABCSystemSource };
