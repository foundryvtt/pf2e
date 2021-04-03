import { ActorPF2e, TokenPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { ItemDataPF2e } from '@item/data-definitions';

export function registerItemCardEvents(html: JQuery) {
    html.on('click', '.card-buttons button', handleButtonEvent);
}

async function handleButtonEvent(event: JQuery.ClickEvent) {
    event.preventDefault();

    const button = $(event.currentTarget);
    const messageId = button.parents('.message').attr('data-message-id') ?? '';
    const message = game.messages.get(messageId);
    if (!message) return;

    // Extract card data
    const senderId = message.user._id;
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

    if (!actor) return;

    // Get the Item
    const itemId = card.attr('data-item-id') ?? '';
    let item: Owned<ItemPF2e> | null = null;
    const embeddedItem = card.attr('data-embedded-item');
    if (embeddedItem) {
        // TODO: This code path is old and should be phased out.
        // Currently it resolves the scenario where the last spell scroll is consumed and the item no longer exists,
        // but a different solution should be preferred over embeddeding the entire consumable in the DOM
        const itemData = JSON.parse(embeddedItem) as ItemDataPF2e | undefined;
        if (itemData) {
            item = actor.items.get(itemData._id) ?? (await ItemPF2e.createOwned(itemData, actor));
        }
    } else {
        item = actor.getOwnedItem(itemId);
    }

    // Handle the actual event
    if (item) {
        item.handleButtonEvent(event);
    } else {
        const strikeIndex = card.attr('data-strike-index');
        const strikeName = card.attr('data-strike-name');
        const strikeAction = actor.data.data.actions[Number(strikeIndex)];

        if (strikeAction && strikeAction.name === strikeName) {
            const options = (actor as ActorPF2e).getRollOptions(['all', 'attack-roll']);
            if (action === 'strikeAttack') strikeAction.variants[0].roll({ event, options });
            else if (action === 'strikeAttack2') strikeAction.variants[1].roll({ event, options });
            else if (action === 'strikeAttack3') strikeAction.variants[2].roll({ event, options });
            else if (action === 'strikeDamage') strikeAction.damage({ event, options });
            else if (action === 'strikeCritical') strikeAction.critical({ event, options });
        }
    }
}
