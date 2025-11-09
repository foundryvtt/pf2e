import type { ActorPF2e, CharacterPF2e } from "@actor";
import { Coins } from "@item/physical/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import appv1 = foundry.appv1;

interface PopupData extends appv1.api.FormApplicationData<ActorPF2e> {
    selection?: string[];
    actorInfo?: {
        id: string;
        name: string;
        checked: boolean;
    }[];
}

interface PopupFormData extends FormData {
    actorIds: string[];
    breakCoins: boolean;
}

/**
 * @category Other
 */
export class DistributeCoinsPopup extends appv1.api.FormApplication<ActorPF2e, DistributeCoinsOptions> {
    constructor(actor: ActorPF2e, options: Partial<DistributeCoinsOptions> = {}) {
        super(actor, options);
    }

    static override get defaultOptions(): appv1.api.FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "distribute-coins";
        options.classes = [];
        options.title = "Distribute Coins";
        options.template = "systems/pf2e/templates/actors/distribute-coins.hbs";
        options.width = "auto";
        return options;
    }

    override async getData(options?: Partial<DistributeCoinsOptions>): Promise<PopupData> {
        const sheetData: PopupData = await super.getData(options);
        const playerActors = (options?.recipients ?? game.actors.contents).filter(
            (a) =>
                a.hasPlayerOwner &&
                a.isOfType("character") &&
                !a.isToken &&
                !a.system.traits.value.some((t) => ["minion", "eidolon"].includes(t)),
        );
        sheetData.actorInfo = playerActors.map((a) => ({
            id: a.id,
            name: a.name,
            checked: game.users.players.some((u) => u.active && u.character?.id === a.id),
        }));

        return sheetData;
    }

    override async _updateObject(_event: Event, formData: Record<string, unknown> & PopupFormData): Promise<void> {
        const thisActor = this.object;
        const selectedActors: CharacterPF2e[] = formData.actorIds.flatMap((actorId) => {
            const maybeActor = game.actors.get(actorId);
            return maybeActor?.isOfType("character") ? maybeActor : [];
        });

        const playerCount = selectedActors.length;
        if (playerCount === 0) {
            return;
        }

        const coinShare = new Coins();
        if (formData.breakCoins) {
            const thisActorCopperValue = thisActor.inventory.coins.copperValue;
            const copperToDistribute = Math.trunc(thisActorCopperValue / playerCount);
            // return if there is nothing to distribute
            if (copperToDistribute === 0) {
                ui.notifications.warn("Nothing to distribute");
                return;
            }
            thisActor.inventory.removeCoins({ cp: copperToDistribute * playerCount });
            coinShare.cp = copperToDistribute % 10;
            coinShare.sp = Math.trunc(copperToDistribute / 10) % 10;
            coinShare.gp = Math.trunc(copperToDistribute / 100) % 10;
            coinShare.pp = Math.trunc(copperToDistribute / 1000);
        } else {
            const thisActorCurrency = thisActor.inventory.coins;
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
            thisActor.inventory.removeCoins(coinsToRemove, { byValue: false });
        }
        let message = `Distributed `;
        if (coinShare.pp !== 0) message += `${coinShare.pp} pp `;
        if (coinShare.gp !== 0) message += `${coinShare.gp} gp `;
        if (coinShare.sp !== 0) message += `${coinShare.sp} sp `;
        if (coinShare.cp !== 0) message += `${coinShare.cp} cp `;
        const each = playerCount > 1 ? "each " : "";
        message += `${each}from ${thisActor.name} to `;
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

    /** Prevent Foundry from converting the actor IDs to boolean values */
    protected override async _onSubmit(
        event: Event,
        options: appv1.api.OnSubmitFormOptions = {},
    ): Promise<Record<string, unknown> | false> {
        const actorIds: string[] = Array.from(this.form.elements).flatMap((element) =>
            element instanceof HTMLInputElement && element.name === "actorIds" && element.checked ? element.value : [],
        );
        options.updateData = fu.mergeObject(options.updateData ?? {}, { actorIds: actorIds });
        return super._onSubmit(event, options);
    }
}

interface DistributeCoinsOptions extends appv1.api.FormApplicationOptions {
    /** An optional initial list of recipients to receive coins */
    recipients?: ActorPF2e[];
}
