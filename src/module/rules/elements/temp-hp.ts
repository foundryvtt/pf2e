import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSource } from "../rules-data-definitions";

/**
 * @category RuleElement
 */
class TempHPRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    constructor(data: TempHPSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        this.data.onCreate = Boolean(this.data.onCreate ?? true);
        this.data.onTurnStart = Boolean(this.data.onTurnStart);
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored || !this.data.onCreate) return;

        const updatedActorData = mergeObject(this.actor.data._source, actorUpdates, { inplace: false });
        const value = this.resolveValue(this.data.value);

        const rollOptions = Array.from(
            new Set([
                ...this.actor.getRollOptions(["all"]),
                ...this.actor.itemTypes.weapon.flatMap((w) =>
                    w.isEquipped ? w.getItemRollOptions("self:weapon") : []
                ),
            ])
        );
        if (this.data.predicate && !this.data.predicate.test(rollOptions)) {
            return;
        }

        if (typeof value !== "number") {
            console.warn("PF2e System | Temporary HP requires a non-zero value field or a formula field");
            return;
        }

        const currentTempHP = Number(getProperty(updatedActorData, "data.attributes.hp.temp")) || 0;
        if (value > currentTempHP) {
            mergeObject(actorUpdates, {
                "data.attributes.hp.temp": value,
                "data.attributes.hp.tempsource": this.item.id,
            });
            this.broadcast(value - currentTempHP);
        }
    }

    /** Refresh the actor's temporary hit points at the start of its turn */
    override onTurnStart(actorUpdates: Record<string, unknown>): void {
        if (this.ignored || !this.data.onTurnStart) return;

        const rollOptions = Array.from(
            new Set([
                ...this.actor.getRollOptions(["all"]),
                ...this.actor.itemTypes.weapon.flatMap((w) =>
                    w.isEquipped ? w.getItemRollOptions("self:weapon") : []
                ),
            ])
        );
        if (this.data.predicate && !this.data.predicate.test(rollOptions)) {
            return;
        }

        const value = this.resolveValue(this.data.value);
        if (typeof value !== "number") {
            console.warn("PF2e System | Temporary HP requires a non-zero value field or a formula field");
            return;
        }

        const updatedActorData = mergeObject(this.actor.data._source, actorUpdates, { inplace: false });
        const currentTempHP = Number(getProperty(updatedActorData, "data.attributes.hp.temp")) || 0;
        if (value > currentTempHP) {
            actorUpdates["data.attributes.hp.temp"] = value;
            this.broadcast(value - currentTempHP);
        }
    }

    override onDelete(actorUpdates: Record<string, unknown>): void {
        const updatedActorData = mergeObject(this.actor.data._source, actorUpdates, { inplace: false });
        if (getProperty(updatedActorData, "data.attributes.hp.tempsource") === this.item.id) {
            mergeObject(actorUpdates, {
                "data.attributes.hp.temp": 0,
            });
            getProperty(actorUpdates, "data.attributes.hp")["-=tempsource"] = null;
        }
    }

    /** Send out a chat message notifying everyone that the actor gained temporary HP */
    broadcast(quantity: number): void {
        ChatMessage.createDocuments([
            {
                user: game.user.id,
                content: game.i18n.format("PF2E.Item.Effect.TempHPBroadcast", { actor: this.actor.name, quantity }),
                whisper: this.actor.hasPlayerOwner ? [] : game.users.filter((u) => u.isGM).map((gm) => gm.id),
            },
        ]);
    }
}

interface TempHPRuleElement extends RuleElementPF2e {
    data: TempHPData;
}

interface TempHPData extends RuleElementData {
    onCreate: boolean;
    onTurnStart: boolean;
}

interface TempHPSource extends RuleElementSource {
    onCreate?: unknown;
    onTurnStart?: unknown;
}

export { TempHPRuleElement };
