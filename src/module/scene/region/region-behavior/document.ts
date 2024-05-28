import type { RegionDocumentPF2e } from "../document.ts";
import type { RegionEventPF2e } from "../types.ts";
import type { BehaviorType, RegionBehaviorTypeInstances } from "./types.ts";

class RegionBehaviorPF2e<
    TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null,
    TSystemData extends object = object,
> extends RegionBehavior<TParent> {
    isOfType<T extends BehaviorType>(...types: T[]): this is RegionBehaviorTypeInstances[T];
    isOfType(...types: string[]): boolean {
        return types.includes(this.type);
    }
}

interface RegionBehaviorPF2e<
    TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null,
    TSystemData extends object = object,
> extends RegionBehavior<TParent> {
    system: TSystemData;

    _handleRegionEvent(event: RegionEventPF2e): Promise<void>;
}

export { RegionBehaviorPF2e };
