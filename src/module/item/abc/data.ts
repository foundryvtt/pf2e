import { ItemSystemSource } from "@item/base/data/system.ts";

interface ABCFeatureEntryData {
    uuid: string;
    img: ImageFilePath;
    name: string;
    level: number;
}

interface ABCSystemSource extends ItemSystemSource {
    items: Record<string, ABCFeatureEntryData>;
}

type ABCSystemData = ABCSystemSource;

export type { ABCFeatureEntryData, ABCSystemData, ABCSystemSource };
