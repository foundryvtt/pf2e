import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { isObject } from "@util";
import { RuleElementPF2e, RuleElementData, RuleElementSource } from "./";
import { RuleElementOptions } from "./base";

/**
 * @category RuleElement
 */
class TempHPRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    constructor(data: TempHPSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.data.onCreate = Boolean(this.data.onCreate ?? true);
        this.data.onTurnStart = Boolean(this.data.onTurnStart);
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored || !this.data.onCreate) return;

        const updatedActorData = mergeObject(this.actor._source, actorUpdates, { inplace: false });
        const value = this.resolveValue(this.data.value);

        const rollOptions = Array.from(
            new Set([
                ...this.actor.getRollOptions(),
                ...this.actor.itemTypes.weapon.flatMap((w) => (w.isEquipped ? w.getRollOptions("self:weapon") : [])),
            ])
        );
        if (!this.predicate.test(rollOptions)) {
            return;
        }

        if (typeof value !== "number") {
            return this.failValidation("Temporary HP requires a non-zero value field or a formula field");
        }

        const currentTempHP = Number(getProperty(updatedActorData, "system.attributes.hp.temp")) || 0;
        if (value > currentTempHP) {
            mergeObject(actorUpdates, {
                "system.attributes.hp.temp": value,
                "system.attributes.hp.tempsource": this.item.id,
            });
            this.broadcast(value, currentTempHP);
        }
    }

    /** Refresh the actor's temporary hit points at the start of its turn */
    override onTurnStart(actorUpdates: Record<string, unknown>): void {
        if (this.ignored || !this.data.onTurnStart) return;

        const rollOptions = Array.from(
            new Set([
                ...this.actor.getRollOptions(["all"]),
                ...this.actor.itemTypes.weapon.flatMap((w) => (w.isEquipped ? w.getRollOptions("self:weapon") : [])),
            ])
        );
        if (!this.predicate.test(rollOptions)) {
            return;
        }

        const value = this.resolveValue(this.data.value);
        if (typeof value !== "number") {
            this.failValidation("Temporary HP requires a non-zero value field or a formula field");
            return;
        }

        const updatedActorData = mergeObject(this.actor._source, actorUpdates, { inplace: false });
        const currentTempHP = Number(getProperty(updatedActorData, "system.attributes.hp.temp")) || 0;
        if (value > currentTempHP) {
            actorUpdates["system.attributes.hp.temp"] = value;
            this.broadcast(value, currentTempHP);
        }
    }

    override onDelete(actorUpdates: Record<string, unknown>): void {
        const updatedActorData = mergeObject(this.actor._source, actorUpdates, { inplace: false });
        if (getProperty(updatedActorData, "system.attributes.hp.tempsource") === this.item.id) {
            mergeObject(actorUpdates, {
                "system.attributes.hp.temp": 0,
            });
            const hpData = getProperty(actorUpdates, "system.attributes.hp");
            if (isObject<{ "-=tempsource": unknown }>(hpData)) {
                hpData["-=tempsource"] = null;
            }
        }
    }

    /** Send out a chat message notifying everyone that the actor gained temporary HP */
    broadcast(newQuantity: number, oldQuantity: number): void {
        const singularOrPlural =
            newQuantity === 1
                ? "PF2E.Encounter.Broadcast.TempHP.SingleNew"
                : "PF2E.Encounter.Broadcast.TempHP.PluralNew";
        const wasAt = oldQuantity > 0 ? game.i18n.format("PF2E.Encounter.Broadcast.TempHP.WasAt", { oldQuantity }) : "";
        const [actor, item] = [this.actor.name, this.item.name];
        const content = game.i18n.format(singularOrPlural, { actor, newQuantity, wasAt, item });
        const recipients = game.users.filter((u) => this.actor.testUserPermission(u, "OWNER")).map((u) => u.id);
        const speaker = ChatMessagePF2e.getSpeaker({ actor: this.actor, token: this.token });
        ChatMessagePF2e.create({ content, speaker, whisper: recipients });
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
