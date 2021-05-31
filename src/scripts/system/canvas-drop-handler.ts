import { TokenPF2e } from '@module/canvas/token';

Hooks.on('dropCanvasData', async (canvas: Canvas<TokenPF2e>, data) => {
    const target = canvas.tokens.placeables.find((token) => {
        const maximumX = token.x + token.hitArea.right;
        const maximumY = token.y + token.hitArea.bottom;

        if (data.x >= token.x && data.y >= token.y && data.x <= maximumX && data.y <= maximumY) {
            return true;
        }

        return false;
    });

    if (target?.actor) {
        if (['character', 'npc', 'loot'].includes(target.actor.type)) {
            const sheet = target.actor.sheet;
            if (data.type === 'Item' && 'onDropItem' in sheet) {
                await sheet.onDropItem(data);
                return true;
            }
        }
    }
    return false;
});
