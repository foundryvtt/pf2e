import { ItemPF2e } from '@item/base';
import { ItemType } from '@item/data-definitions';

export function registerItemCardEvents(html: JQuery) {
    html.on('click', '.card-buttons button', handleButtonEvent);
}

function handleButtonEvent(event: JQuery.ClickEvent) {
    const messageId = $(event.currentTarget).parents('.message').attr('data-message-id');
    const message = game.messages.get(messageId);
    if (!message) return;

    const itemClassName = message?.data.flags[game.system.id]?.itemType as ItemType;
    const itemClass =
        itemClassName in CONFIG.PF2E.Item.entityClasses ? CONFIG.PF2E.Item.entityClasses[itemClassName] : ItemPF2e;
    itemClass.handleButtonEvent(message, event);
}
