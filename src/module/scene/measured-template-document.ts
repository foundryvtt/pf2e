import type { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import type { MeasuredTemplatePF2e } from "@module/canvas/measured-template.ts";
import { ItemOriginFlag } from "@module/chat-message/data.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { toggleClearTemplatesButton } from "@module/chat-message/helpers.ts";
import { ScenePF2e } from "./document.ts";

export class MeasuredTemplateDocumentPF2e<
    TParent extends ScenePF2e | null = ScenePF2e | null,
> extends MeasuredTemplateDocument<TParent> {
    get item(): ItemPF2e<ActorPF2e> | null {
        const origin = this.flags.pf2e?.origin;
        const uuid = origin?.uuid;
        if (!uuid) return null;
        const item = fromUuidSync(uuid as string);
        if (!(item instanceof ItemPF2e)) return null;

        if (item?.isOfType("spell")) {
            const overlayIds = origin?.variant?.overlays;
            const castRank = (origin?.castLevel ?? item.rank) as number;
            const modifiedSpell = item.loadVariant({ overlayIds, castLevel: castRank });
            return modifiedSpell ?? item;
        }

        return item;
    }

    /** The chat message from which this template was spawned */
    get message(): ChatMessagePF2e | null {
        return game.messages.get(this.flags.pf2e?.messageId ?? "") ?? null;
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

export interface MeasuredTemplateDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null>
    extends MeasuredTemplateDocument<TParent> {
    get object(): MeasuredTemplatePF2e<this> | null;

    flags: DocumentFlags & {
        pf2e?: {
            messageId?: string;
            origin?: ItemOriginFlag;
        };
    };
}
