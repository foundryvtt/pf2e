import type { ActorType } from "@actor/types.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import * as R from "remeda";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * @category RuleElement
 */
class TempHPRuleElement extends RuleElement<TempHPRuleSchema> {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    static override defineSchema(): TempHPRuleSchema {
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: false }),
            events: new fields.SchemaField(
                { onCreate: new fields.BooleanField(), onTurnStart: new fields.BooleanField() },
                {
                    required: true,
                    nullable: false,
                    initial: { onCreate: true, onTurnStart: false },
                },
            ),
        };
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored || !this.events.onCreate) return;

        const updatedActorData = fu.mergeObject(this.actor._source, actorUpdates, { inplace: false });
        const value = Math.trunc(Number(this.resolveValue(this.value)));

        const rollOptions = Array.from(
            new Set([
                ...this.actor.getRollOptions(),
                ...this.actor.itemTypes.weapon.flatMap((w) => (w.isEquipped ? w.getRollOptions("self:weapon") : [])),
            ]),
        );
        if (!this.test(rollOptions)) {
            return;
        }

        if (Number.isNaN(value) || value < 0) {
            return this.failValidation("value: must resolve to a positive number");
        }

        const currentTempHP = Number(fu.getProperty(updatedActorData, "system.attributes.hp.temp")) || 0;
        if (value > currentTempHP) {
            fu.mergeObject(actorUpdates, {
                "system.attributes.hp.temp": value,
                "system.attributes.hp.tempsource": this.item.id,
            });
            this.broadcast(value, currentTempHP);
        }
    }

    /** Refresh the actor's temporary hit points at the start of its turn */
    override async onUpdateEncounter(data: {
        event: "initiative-roll" | "turn-start";
        actorUpdates: Record<string, unknown>;
    }): Promise<void> {
        if (this.ignored || data.event !== "turn-start" || !this.events.onTurnStart) {
            return;
        }

        const rollOptions = Array.from(
            new Set([
                ...this.actor.getRollOptions(["all"]),
                ...this.actor.itemTypes.weapon.flatMap((w) => (w.isEquipped ? w.getRollOptions("self:weapon") : [])),
            ]),
        );
        if (!this.test(rollOptions)) {
            return;
        }

        const value = this.resolveValue(this.value);
        if (typeof value !== "number") {
            return this.failValidation("value: must resolve to a number");
        }

        const actorUpdates = data.actorUpdates;
        const updatedActorData = fu.mergeObject(this.actor._source, actorUpdates, { inplace: false });
        const currentTempHP = Number(fu.getProperty(updatedActorData, "system.attributes.hp.temp")) || 0;
        if (value > currentTempHP) {
            actorUpdates["system.attributes.hp.temp"] = value;
            this.broadcast(value, currentTempHP);
        }
    }

    override onDelete(actorUpdates: Record<string, unknown>): void {
        const updatedActorData = fu.mergeObject(this.actor._source, actorUpdates, { inplace: false });
        if (fu.getProperty(updatedActorData, "system.attributes.hp.tempsource") === this.item.id) {
            fu.mergeObject(actorUpdates, { "system.attributes.hp.temp": 0 });
            const hpData = fu.getProperty(actorUpdates, "system.attributes.hp");
            if (R.isPlainObject(hpData)) {
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

interface TempHPRuleElement extends RuleElement<TempHPRuleSchema>, ModelPropsFromRESchema<TempHPRuleSchema> {}

type TempHPEventsSchema = {
    /** Whether the temporary hit points are immediately applied */
    onCreate: fields.BooleanField;
    /** Whether the temporary hit points renew each round */
    onTurnStart: fields.BooleanField;
};

type TempHPRuleSchema = RuleElementSchema & {
    /** The quantity of temporary hit points to add */
    value: ResolvableValueField<true, false, false>;
    /** World events in which temporary HP is added or renewed */
    events: fields.SchemaField<
        TempHPEventsSchema,
        fields.SourceFromSchema<TempHPEventsSchema>,
        fields.ModelPropsFromSchema<TempHPEventsSchema>,
        true,
        false,
        true
    >;
};

export { TempHPRuleElement };
