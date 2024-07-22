import { resetActors } from "@actor/helpers.ts";
import type { RegionDocumentPF2e } from "@scene";
import type { EnvironmentBehaviorType } from "./environment.ts";

class RegionBehaviorPF2e<
    TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null,
> extends RegionBehavior<TParent> {
    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void {
        // Reset actors inside the region of this behavior
        if (this.viewed && this.type === "environment") {
            const system: Partial<EnvironmentBehaviorType["_source"]> = data.system ?? {};
            if (system.environmentTypes || system.mode) {
                const tokens = [...(this.region?.tokens ?? [])];
                resetActors(
                    tokens.flatMap((t) => t.actor ?? []),
                    { tokens: true },
                );
            }
        }

        return super._onUpdate(data, operation, userId);
    }
}

export { RegionBehaviorPF2e };
