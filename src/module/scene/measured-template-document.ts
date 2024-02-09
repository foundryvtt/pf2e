import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import type { EffectAreaType } from "@item/spell/types.ts";
import type { MeasuredTemplatePF2e } from "@module/canvas/measured-template.ts";
import { ItemOriginFlag } from "@module/chat-message/data.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { toggleClearTemplatesButton } from "@module/chat-message/helpers.ts";
import type { ScenePF2e } from "./document.ts";

class MeasuredTemplateDocumentPF2e<
    TParent extends ScenePF2e | null = ScenePF2e | null,
> extends MeasuredTemplateDocument<TParent> {
    get actor(): ActorPF2e | null {
        const uuid = this.flags.pf2e?.origin?.actor;
        if (!uuid) return null;
        const document = fromUuidSync(uuid);
        return document instanceof ActorPF2e ? document : this.item?.actor ?? null;
    }

    get item(): ItemPF2e<ActorPF2e> | null {
        const origin = this.flags.pf2e?.origin;
        const uuid = origin?.uuid;
        if (!uuid) return null;
        const item = fromUuidSync(uuid as string);
        if (!(item instanceof ItemPF2e)) return null;

        if (item?.isOfType("spell")) {
            const overlayIds = origin?.variant?.overlays;
            const castRank = (origin?.castRank ?? item.rank) as number;
            const modifiedSpell = item.loadVariant({ overlayIds, castRank: castRank });
            return modifiedSpell ?? item;
        }

        return item;
    }

    /** The chat message from which this template was spawned */
    get message(): ChatMessagePF2e | null {
        return game.messages.get(this.flags.pf2e?.messageId ?? "") ?? null;
    }

    get areaType(): EffectAreaType | null {
        return this.flags.pf2e.areaType;
    }

    /** Ensure the source has a `pf2e` flag along with an `areaType` if directly inferable. */
    protected override _initializeSource(
        data: object,
        options?: DataModelConstructionOptions<TParent>,
    ): this["_source"] {
        const initialized = super._initializeSource(data, options);
        const areaType = initialized.t === "cone" ? "cone" : initialized.t === "ray" ? "line" : null;
        initialized.flags.pf2e = fu.mergeObject({ areaType }, initialized.flags.pf2e ?? {});
        return initialized;
    }

    /** If present, show the clear-template button on the message from which this template was spawned */
    protected override _onCreate(
        data: this["_source"],
        options: DocumentModificationContext<TParent>,
        userId: string,
    ): void {
        super._onCreate(data, options, userId);
        toggleClearTemplatesButton(this.message);
    }

    /** If present, hide the clear-template button on the message from which this template was spawned */
    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);
        toggleClearTemplatesButton(this.message);
    }
}

interface MeasuredTemplateDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null>
    extends MeasuredTemplateDocument<TParent> {
    get object(): MeasuredTemplatePF2e<this> | null;

    flags: DocumentFlags & {
        pf2e: {
            messageId?: string;
            origin?: ItemOriginFlag;
            areaType: EffectAreaType | null;
        };
    };
}

export { MeasuredTemplateDocumentPF2e };
