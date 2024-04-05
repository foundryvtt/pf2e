import type { ActorPF2e } from "@actor";
import type { StrikeData } from "@actor/data/base.ts";
import type { ItemPF2e } from "@item";
import type { CheckContextChatFlag } from "@module/chat-message/data.ts";
import { CheckRoll } from "@system/check/roll.ts";
import type { Statistic } from "@system/statistic/statistic.ts";
import { sluggify } from "@util";
import { RollContext } from "./base.ts";
import type { DamageContextConstructorParams } from "./types.ts";

class DamageContext<
    TSelf extends ActorPF2e,
    TStatistic extends Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null,
> extends RollContext<TSelf, TStatistic, TItem> {
    constructor(params: DamageContextConstructorParams<TSelf, TStatistic, TItem>) {
        super(params);
        // In case the user rolled damage from their sheet, try to fish out the check context from chat
        params.checkContext ??= this.#findMatchingCheckContext();

        if (params.outcome) params.options.add(`check:outcome:${sluggify(params.outcome)}`);

        const substitution = params.checkContext?.substitutions.find((s) => s.selected);
        if (substitution) {
            params.options.add(`check:substitution:${substitution.slug}`);
        }
    }

    #findMatchingCheckContext(): CheckContextChatFlag | null {
        const { origin, target } = this.unresolved;
        const item = origin?.item;
        if (this.viewOnly || !origin?.actor || !item?.isOfType("melee", "weapon") || !target?.token) {
            return null;
        }

        const actor = origin.actor;
        const checkMessage = game.messages.contents
            .slice(-3)
            .reverse()
            .find((message) => {
                if (!message.rolls.some((r) => r instanceof CheckRoll)) return false;
                if (message.actor?.uuid !== actor.uuid) return false;
                if (target.token !== message.target?.token.object) return false;

                const messageItem = message.item;
                if (!messageItem?.isOfType("melee", "weapon")) return false;
                const paramsItemSlug = item.slug ?? sluggify(item.name);
                const messageItemSlug = messageItem.slug ?? sluggify(messageItem.name);

                return !!(
                    paramsItemSlug === messageItemSlug &&
                    item.uuid === item.uuid &&
                    item.isMelee === messageItem.isMelee
                );
            });

        return (checkMessage?.flags.pf2e.context ?? null) as CheckContextChatFlag | null;
    }
}

export { DamageContext };
