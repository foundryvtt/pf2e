/* global ChatMessage CONST FormApplication ui */
import { addCoinsSimple, calculateValueOfCurrency, removeCoinsSimple } from '../../item/treasure';

/**
 * @category Other
 */
export class DistributeCoinsPopup extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'distribute-coins';
        options.classes = [];
        options.title = 'Distribute Coins';
        options.template = 'systems/pf2e/templates/actors/distribute-coins.html';
        options.width = "auto";
        return options;
    }

    activateListeners(html) {
        super.activateListeners(html);
    }

    async _updateObject(event: Event, formData: any) {
        const thisActor = this.object;
        const selectedActors = [];
        for (let i = 0;i < formData.selection.length;i++) {
            if (formData.selection[i]) {
                selectedActors.push(game.actors.find(actor => actor.id === this.form[i].id));
            }
        }
        const playerCount = selectedActors.length;
        if (thisActor.data.items !== undefined)
        {
            const thisActorCurrency = calculateValueOfCurrency(thisActor.data.items);
            const coinShare = {
                pp:Math.trunc(thisActorCurrency.pp / playerCount),
                gp:Math.trunc(thisActorCurrency.gp / playerCount),
                sp:Math.trunc(thisActorCurrency.sp / playerCount),
                cp:Math.trunc(thisActorCurrency.cp / playerCount),
            };
            // return if there is nothing to distribute
            if (coinShare.pp === 0 && coinShare.gp === 0 && coinShare.sp === 0 && coinShare.cp === 0) {
                ui.notifications.warn ("Nothing to distribute");
                return;
            }
            removeCoinsSimple(
                thisActor,
                {coins: {
                    pp:coinShare.pp * playerCount,
                    gp:coinShare.gp * playerCount,
                    sp:coinShare.sp * playerCount,
                    cp:coinShare.cp * playerCount,
                }
            },);
            let message = `Distributed `;
            if (coinShare.pp !== 0) message += `${coinShare.pp} pp `;
            if (coinShare.gp !== 0) message += `${coinShare.gp} gp `;
            if (coinShare.sp !== 0) message += `${coinShare.sp} sp `;
            if (coinShare.cp !== 0) message += `${coinShare.cp} cp `;
            message += `each from ${thisActor.name} to `;
            for (let x=0;x<playerCount;x++) {
                const actor = selectedActors[x];

                addCoinsSimple(actor, {coins: coinShare,combineStacks:true});
                if (x === 0)
                    message += `${actor.name}`;
                else if (x<playerCount-1)
                    message += `, ${actor.name}`;
                else
                    message += ` and ${actor.name}.`;
            }
            ChatMessage.create({
                user: game.user.id,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                content: message
            });
        }
    }

    getData() {
        const sheetData = super.getData();
        sheetData.actorInfo = [];
        const playerActors = game.actors.filter(actor => (actor.hasPlayerOwner && actor.data.type === "character"));
        const idsOfPlayerCharacters = game.users.players.map(x => x.character.id);
        for (let i = 0;i < playerActors.length;i++) {
            sheetData.actorInfo.push({
                id: playerActors[i].id,
                name: playerActors[i].name,
                checked:idsOfPlayerCharacters.some(id => id === playerActors[i].id),
            });
        }
        return sheetData
    }
}
