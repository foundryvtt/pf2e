import type { ActorPF2e, CharacterPF2e } from "@actor";
import { Coins } from "@item/physical/helpers.ts";
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

        const coinShare = new Coins();
        if (formData.object.breakCoins) {
            const thisActorCopperValue = actor.inventory.coins.copperValue;
            const copperToDistribute = Math.trunc(thisActorCopperValue / playerCount);
            // return if there is nothing to distribute
            if (copperToDistribute === 0) {
                ui.notifications.warn("Nothing to distribute");
                return;
            }
            actor.inventory.removeCoins({ cp: copperToDistribute * playerCount });
            coinShare.cp = copperToDistribute % 10;
            coinShare.sp = Math.trunc(copperToDistribute / 10) % 10;
            coinShare.gp = Math.trunc(copperToDistribute / 100) % 10;
            coinShare.pp = Math.trunc(copperToDistribute / 1000);
        } else {
            const thisActorCurrency = actor.inventory.coins;
            coinShare.pp = Math.trunc(thisActorCurrency.pp / playerCount);
            coinShare.cp = Math.trunc(thisActorCurrency.cp / playerCount);
            coinShare.gp = Math.trunc(thisActorCurrency.gp / playerCount);
            coinShare.sp = Math.trunc(thisActorCurrency.sp / playerCount);
            // return if there is nothing to distribute
            if (coinShare.pp === 0 && coinShare.gp === 0 && coinShare.sp === 0 && coinShare.cp === 0) {
                ui.notifications.warn("Nothing to distribute");
                return;
            }

            const coinsToRemove = coinShare.scale(playerCount);
            actor.inventory.removeCoins(coinsToRemove, { byValue: false });
        }
        let message = `Distributed `;
        if (coinShare.pp !== 0) message += `${coinShare.pp} pp `;
        if (coinShare.gp !== 0) message += `${coinShare.gp} gp `;
        if (coinShare.sp !== 0) message += `${coinShare.sp} sp `;
        if (coinShare.cp !== 0) message += `${coinShare.cp} cp `;
        const each = playerCount > 1 ? "each " : "";
        message += `${each}from ${actor.name} to `;
        for (const actor of selectedActors) {
            await actor.inventory.addCoins(coinShare);
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
    actorInfo: {
        id: string;
        name: string;
        checked: boolean;
    }[];
}
