import type { DocumentConstructionContext } from "@common/_types.mjs";
import type { DatabaseCreateCallbackOptions, DatabaseDeleteCallbackOptions } from "@common/abstract/_module.d.mts";
import type EmbeddedCollection from "@common/abstract/embedded-collection.d.mts";
import type { DocumentFlags } from "@common/data/_types.d.mts";
import type { EffectAreaShape } from "@item/types.ts";
import type { RegionPF2e } from "@module/canvas/region.ts";
import type { ItemOriginFlag } from "@module/chat-message/data.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { toggleClearEffectAreaButton } from "@module/chat-message/helpers.ts";
import type { ScenePF2e } from "@scene";
import type { SpecificRegionBehavior } from "@scene/region-behavior/types.ts";

class RegionDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends RegionDocument<TParent> {
    /** The chat message from which this effect area was spawned */
    get message(): ChatMessagePF2e | null {
        return game.messages.get(this.flags[SYSTEM_ID]?.messageId ?? "") ?? null;
    }

    /** The region's game-mechanical shape if it is an effect area */
    get areaShape(): EffectAreaShape | null {
        return this.flags[SYSTEM_ID].areaShape;
    }

    /** Whether this region is a Pathfinder 2e effect area */
    get isEffectArea(): boolean {
        return this.shapes.length === 1 && !!this.areaShape;
    }

    /** Ensure the source has a `pf2e` flag along with an `areaShape` if directly inferable. */
    protected override _initializeSource(
        data: object,
        options?: DocumentConstructionContext<TParent>,
    ): this["_source"] {
        const initialized = super._initializeSource(data, options);
        const areaShape = initialized.t === "cone" ? "cone" : initialized.t === "ray" ? "line" : null;
        initialized.flags[SYSTEM_ID] = fu.mergeObject({ areaShape }, initialized.flags[SYSTEM_ID] ?? {});
        return initialized;
    }

    /** If present, show the clear-template button on the message from which this template was spawned */
    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void {
        super._onCreate(data, options, userId);
        toggleClearEffectAreaButton(this.message);
    }

    /** If present, hide the clear-template button on the message from which this template was spawned */
    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        super._onDelete(options, userId);
        toggleClearEffectAreaButton(this.message);
    }
}

interface RegionDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends RegionDocument<TParent> {
    readonly behaviors: EmbeddedCollection<SpecificRegionBehavior<this>>;

    get object(): RegionPF2e<this>;

    flags: DocumentFlags & {
        [SYSTEM_ID]: {
            messageId?: string;
            origin?: ItemOriginFlag;
            areaShape: EffectAreaShape | null;
        };
    };
}

export { RegionDocumentPF2e };
