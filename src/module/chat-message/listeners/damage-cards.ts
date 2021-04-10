import { ActorPF2e, TokenPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { ItemDataPF2e } from '@item/data-definitions';
import { MeleePF2e } from '@item/others';
import { StatisticModifier } from '@module/modifiers';

export const DamageCards = {
    listen: ($html: JQuery) => {
        $html.on('click', '.card-buttons button', (event) => {
            event.preventDefault();

            // Extract card data
            const button = $(event.currentTarget);
            const messageId = button.parents('.message').attr('data-message-id') ?? '';
            const senderId = game.messages.get(messageId)?.user?._id ?? '';
            const card = button.parents('.chat-card');
            const action = button.attr('data-action');

            // Confirm roll permission
            if (!game.user.isGM && game.user._id !== senderId && action !== 'save') return;

            // Get the Actor from a synthetic Token
            let actor: ActorPF2e | null;
            const tokenKey = card.attr('data-token-id');
            if (tokenKey) {
                const [sceneId, tokenId] = tokenKey.split('.');
                let token: TokenPF2e | undefined;
                if (sceneId === canvas.scene?._id) token = canvas.tokens.get(tokenId);
                else {
                    const scene = game.scenes.get(sceneId);
                    if (!scene) return;
                    const tokenData = scene.data.tokens.find((t) => t._id === tokenId);
                    if (tokenData) token = new Token(tokenData);
                }
                if (!token) return;
                actor = ActorPF2e.fromToken(token);
            } else {
                actor = game.actors.get(card.attr('data-actor-id') ?? '');
            }

            // Get the Item
            if (!actor) return;
            const itemId = card.attr('data-item-id') ?? '';
            let item: Owned<ItemPF2e> | null = null;
            let itemData: ItemDataPF2e | undefined = undefined;
            const embeddedItem = $(event.target).parents('.item-card').attr('data-embedded-item');
            if (embeddedItem) {
                itemData = JSON.parse(embeddedItem) as ItemDataPF2e | undefined;
                if (itemData) {
                    item = actor.items.get(itemData._id);
                }
            } else {
                item = actor.getOwnedItem(itemId);
                itemData = item?.data;
            }
            if (item && itemData) {
                const strike: StatisticModifier = actor.data.data.actions?.find(
                    (a: StatisticModifier) => a.item === itemId,
                );
                const rollOptions = (actor as ActorPF2e)?.getRollOptions(['all', 'attack-roll']);

                if (action === 'weaponAttack') {
                    if (strike && rollOptions) {
                        strike.variants[0].roll({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(event);
                    }
                } else if (action === 'weaponAttack2') {
                    if (strike && rollOptions) {
                        strike.variants[1].roll({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(event, 2);
                    }
                } else if (action === 'weaponAttack3') {
                    if (strike && rollOptions) {
                        strike.variants[2].roll({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(event, 3);
                    }
                } else if (action === 'weaponDamage') {
                    if (strike && rollOptions) {
                        strike.damage({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponDamage(event);
                    }
                } else if (action === 'weaponDamageCritical' || action === 'criticalDamage') {
                    if (strike && rollOptions) {
                        strike.critical({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponDamage(event, true);
                    }
                } else if (action === 'npcAttack' && item instanceof MeleePF2e) item.rollNPCAttack(event);
                else if (action === 'npcAttack2' && item instanceof MeleePF2e) item.rollNPCAttack(event, 2);
                else if (action === 'npcAttack3' && item instanceof MeleePF2e) item.rollNPCAttack(event, 3);
                else if (action === 'npcDamage' && item instanceof MeleePF2e) item.rollNPCDamage(event);
                else if (action === 'npcDamageCritical' && item instanceof MeleePF2e) item.rollNPCDamage(event, true);
                // Spell actions
                else if (action === 'spellAttack') item.rollSpellAttack(event);
                else if (action === 'spellAttack2') item.rollSpellAttack(event, 2);
                else if (action === 'spellAttack3') item.rollSpellAttack(event, 3);
                else if (action === 'spellDamage') item.rollSpellDamage(event);
                else if (action === 'spellCounteract') item.rollCounteract(event);
                // Consumable usage
                else if (action === 'consume') item.rollConsumable(event);
                else if (action === 'save') ActorPF2e.rollSave(event, item);
            } else {
                const strikeIndex = card.attr('data-strike-index');
                const strikeName = card.attr('data-strike-name');
                const strikeAction = actor.data.data.actions[Number(strikeIndex)];

                if (strikeAction && strikeAction.name === strikeName) {
                    const options = (actor as ActorPF2e).getRollOptions(['all', 'attack-roll']);
                    if (action === 'strikeAttack') strikeAction.variants[0].roll({ event: event, options });
                    else if (action === 'strikeAttack2') strikeAction.variants[1].roll({ event: event, options });
                    else if (action === 'strikeAttack3') strikeAction.variants[2].roll({ event: event, options });
                    else if (action === 'strikeDamage') strikeAction.damage({ event: event, options });
                    else if (action === 'strikeCritical') strikeAction.critical({ event: event, options });
                }
            }
        });
    },
};
