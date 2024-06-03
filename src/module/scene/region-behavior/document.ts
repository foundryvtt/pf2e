import { resetActors } from "@actor/helpers.ts";
import type { RegionBehaviorInstanceType, RegionBehaviorInstances } from "./types.ts";

class RegionBehaviorPF2e<TParent extends RegionDocument = RegionDocument> extends RegionBehavior<TParent> {
    isOfType<T extends RegionBehaviorInstanceType>(...types: T[]): this is RegionBehaviorInstances<TParent>[T];
    isOfType(...types: string[]): boolean {
        return types.some((t) => t === this.type);
    }

    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void {
        // Reset actors inside the region of this behavior
        if (this.viewed && this.isOfType("environment")) {
            const system = data.system ?? {};
            if ("environmentTypes" in system || "mode" in system) {
                resetActors(
                    [...this.region.tokens].flatMap((t) => t.actor ?? []),
                    { tokens: true },
                );
            }
        }

        return super._onUpdate(data, operation, userId);
    }
}

export { RegionBehaviorPF2e };
