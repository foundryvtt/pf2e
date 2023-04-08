import { ActorPF2e, CharacterPF2e } from "@actor";
import { CoinsPF2e } from "@item/physical/helpers.ts";

interface PopupData extends FormApplicationData<ActorPF2e> {
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
export class DistributeCoinsPopup extends FormApplication<ActorPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "distribute-coins";
        options.classes = [];
        options.title = "Distribute Coins";
        options.template = "systems/pf2e/templates/actors/distribute-coins.hbs";
        options.width = "auto";
        return options;
    }

    override async _updateObject(_event: Event, formData: Record<string, unknown> & PopupFormData): Promise<void> {
        const thisActor = this.object;
        const selectedActors: CharacterPF2e[] = formData.actorIds.flatMap((actorId) => {
            const maybeActor = game.actors.get(actorId);
            return maybeActor instanceof CharacterPF2e ? maybeActor : [];
        });

        const playerCount = selectedActors.length;
        if (playerCount === 0) {
            return;
        }

        if (thisActor instanceof ActorPF2e) {
            const coinShare = new CoinsPF2e();
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
            ChatMessage.create({
                user: game.user.id,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                content: message,
            });
        }
    }

    /** Prevent Foundry from converting the actor IDs to boolean values */
    protected override async _onSubmit(
        event: Event,
        options: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        const actorIds: string[] = Array.from(this.form.elements).flatMap((element) =>
            element instanceof HTMLInputElement && element.name === "actorIds" && element.checked ? element.value : []
        );
        options.updateData = mergeObject(options.updateData ?? {}, { actorIds: actorIds });
        return super._onSubmit(event, options);
    }

    override async getData(): Promise<PopupData> {
        const sheetData: PopupData = await super.getData();
        const playerActors = game.actors.filter((actor) => actor.hasPlayerOwner && actor.isOfType("character"));
        sheetData.actorInfo = playerActors.map((actor) => ({
            id: actor.id,
            name: actor.name,
            checked: game.users.players.some((user) => user.active && user.character?.id === actor.id),
        }));

        return sheetData;
    }
}
