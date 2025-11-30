import type { ActorPF2e, CharacterPF2e } from "@actor";
import { Coins } from "@item/physical/helpers.ts";
import { COIN_DENOMINATIONS } from "@item/physical/values.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";

/** Allows the distribution and split of coins to multiple players */
export class DistributeCoinsDialog extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    constructor(
        options: Partial<DistributeCoinsConfiguration> & Required<Pick<DistributeCoinsConfiguration, "actor">>,
    ) {
        super(options);
        this.actor = options.actor;
    }

    static override DEFAULT_OPTIONS: DeepPartial<DistributeCoinsConfiguration> = {
        id: "distribute-coins",
        tag: "form",
        window: {
            icon: "fa-solid fa-coins",
            title: "Distribute Coins",
            contentClasses: ["standard-form"],
        },
        position: {
            width: 400,
        },
        form: {
            closeOnSubmit: true,
            handler: DistributeCoinsDialog.#onSubmit,
        },
    };

    static override PARTS = {
        base: { template: `${SYSTEM_ROOT}/templates/actors/distribute-coins.hbs`, root: true },
    };

    actor: ActorPF2e;
    declare options: DistributeCoinsConfiguration;

    override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<DistributeCoinsContext> {
        const data = await super._prepareContext(options);
        const currency = this.actor.inventory.currency;
        const playerActors = (this.options.recipients ?? game.actors.contents).filter(
            (a) =>
                a.hasPlayerOwner &&
                a.isOfType("character") &&
                !a.isToken &&
                !a.system.traits.value.some((t) => ["minion", "eidolon"].includes(t)),
        );
        if (playerActors.length === 0) {
            ui.notifications.warn("PF2E.loot.NoPlayerCharacters", { localize: true });
            await this.close();
        }

        return {
            ...data,
            rootId: this.id,
            canBreakCoins: SYSTEM_ID === "pf2e" || COIN_DENOMINATIONS.some((d) => currency[d] > 0),
            actorInfo: playerActors.map((a) => ({
                id: a.id,
                name: a.name,
                checked: game.users.players.some((u) => u.active && u.character?.id === a.id),
            })),
        };
    }

    static async #onSubmit(
        this: DistributeCoinsDialog,
        _event: Event,
        form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
    ) {
        // Get actor ids, we need to get it directly since the DOM may not give back an array if only one
        const actor = this.actor;
        const actorIds: string[] = Array.from(form.elements).flatMap((element) =>
            element instanceof HTMLInputElement && element.name === "actorIds" && element.checked ? element.value : [],
        );

        const selectedActors: CharacterPF2e[] = actorIds.flatMap((actorId) => {
            const maybeActor = game.actors.get(actorId);
            return maybeActor?.isOfType("character") ? maybeActor : [];
        });

        const playerCount = selectedActors.length;
        if (playerCount === 0) return;

        // Calculate the share and what we're removing. Credits/UPB cannot be split
        const available = actor.inventory.currency;
        const share = new Coins({
            credits: Math.trunc(available.credits / playerCount),
            upb: Math.trunc(available.upb / playerCount),
        });
        if (formData.object.breakCoins) {
            const thisActorCopperValue = actor.inventory.coins.copperValue - share.scale(playerCount).copperValue;
            const copperToDistribute = Math.trunc(thisActorCopperValue / playerCount);
            share.cp = copperToDistribute % 10;
            share.sp = Math.trunc(copperToDistribute / 10) % 10;
            share.gp = Math.trunc(copperToDistribute / 100) % 10;
            share.pp = Math.trunc(copperToDistribute / 1000);
        } else {
            share.pp = Math.trunc(available.pp / playerCount);
            share.cp = Math.trunc(available.cp / playerCount);
            share.gp = Math.trunc(available.gp / playerCount);
            share.sp = Math.trunc(available.sp / playerCount);
        }

        // return if there is nothing to distribute
        if (share.copperValue === 0) {
            ui.notifications.warn("Nothing to distribute");
            return;
        }

        await Promise.all([
            actor.inventory.removeCoins(share.scale(playerCount), { byValue: !!formData.object.breakCoins }),
            ...selectedActors.map((a) => a.inventory.addCurrency(share)),
        ]);

        const each = playerCount > 1 ? "each " : "";
        let message = `Distributed ${share.toString({ unit: "raw" })} ${each}from ${actor.name} to `;

        // Distribute to actors
        for (const actor of selectedActors) {
            const index = selectedActors.indexOf(actor);
            if (index === 0) message += `${actor.name}`;
            else if (index < playerCount - 1) message += `, ${actor.name}`;
            else message += ` and ${actor.name}.`;
        }

        ChatMessagePF2e.create({
            author: game.user.id,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
            content: message,
        });
    }
}

interface DistributeCoinsConfiguration extends fa.api.DialogV2Configuration {
    actor: ActorPF2e;
    /** An optional initial list of recipients to receive coins */
    recipients?: ActorPF2e[];
}

interface DistributeCoinsContext extends fa.ApplicationRenderContext {
    rootId: string;
    canBreakCoins: boolean;
    actorInfo: {
        id: string;
        name: string;
        checked: boolean;
    }[];
}
