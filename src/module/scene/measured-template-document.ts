import { MeasuredTemplatePF2e } from "@module/canvas/measured-template.ts";
import { ScenePF2e } from "./document.ts";
import { ItemPF2e } from "@item";
import { ActorPF2e } from "@actor";
import { ItemOriginFlag } from "@module/chat-message/data.ts";

export class MeasuredTemplateDocumentPF2e<
    TParent extends ScenePF2e | null = ScenePF2e | null
> extends MeasuredTemplateDocument<TParent> {
    get item(): ItemPF2e<ActorPF2e> | null {
        const origin = this.flags.pf2e?.origin;
        const uuid = origin?.uuid;
        if (!uuid) return null;
        const item = fromUuidSync(uuid as string);
        if (!(item instanceof ItemPF2e)) return null;

        if (item?.isOfType("spell")) {
            const overlayIds = origin?.variant?.overlays;
            const castLevel = (origin?.castLevel ?? item.level) as number;
            const modifiedSpell = item.loadVariant({ overlayIds, castLevel });
            return modifiedSpell ?? item;
        }

        return item;
    }
}

export interface MeasuredTemplateDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null>
    extends MeasuredTemplateDocument<TParent> {
    get object(): MeasuredTemplatePF2e<this> | null;

    flags: DocumentFlags & {
        pf2e?: {
            origin?: ItemOriginFlag;
        };
    };
}
