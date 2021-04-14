let ITEM_UUID = 'Compendium.pf2e.feat-effects.gYpy9XBPScIlY93p'; // Stance: Mountain Stance

function checkFeat(slug) {
    if (token.actor.items.find((i) => i.data.data.slug === slug && i.type === 'feat')) {
        return true;
    }
    return false;
}

if (checkFeat('mountain-stronghold')) {
    ITEM_UUID = 'Compendium.pf2e.feat-effects.LXbVcutEIW8eWZEz';
}
if (checkFeat('mountain-quake')) {
    ITEM_UUID = 'Compendium.pf2e.feat-effects.wuERa7exfXXl6I37';
}

(async () => {
    const effect = duplicate(await fromUuid(ITEM_UUID));
    effect.flags.core = effect.flags.core ?? {};
    effect.flags.core.sourceId = effect.flags.core.sourceId ?? ITEM_UUID;
    for await (const token of canvas.tokens.controlled) {
        let existing = token.actor.items.find(
            (i) => i.type === 'effect' && i?.data?.flags?.core?.sourceId === ITEM_UUID,
        );
        if (existing) {
            token.actor.deleteOwnedItem(existing._id);
        } else {
            let clothingPotency = 0;
            const clothing = token.actor.items
                .filter((item) => item.data.type === 'armor')
                ?.filter((item) => item.data.data.slug === 'clothing-explorers')
                ?.find((item) => item.data.data.equipped.value);
            if (clothing) {
                clothingPotency = parseInt(clothing.data?.data?.potencyRune?.value);
            }
            let bracers = token.actor.items
                .filter((item) => item.data.type === 'equipment')
                ?.filter((item) => item.data.data.slug === 'bracers-of-armor-i')
                ?.filter((item) => item.data.data.equipped.value)
                ?.find((item) => item.data.data.invested.value)
                ? 1
                : 0;
            bracers = token.actor.items
                .filter((item) => item.data.type === 'equipment')
                ?.filter((item) => item.data.data.slug === 'bracers-of-armor-ii')
                ?.filter((item) => item.data.data.equipped.value)
                ?.find((item) => item.data.data.invested.value)
                ? 2
                : bracers;
            bracers = token.actor.items
                .filter((item) => item.data.type === 'equipment')
                ?.filter((item) => item.data.data.slug === 'bracers-of-armor-iii')
                ?.filter((item) => item.data.data.equipped.value)
                ?.find((item) => item.data.data.invested.value)
                ? 3
                : bracers;
            let mageArmorBonus = 0;
            const mageArmor = token.actor.items
                .filter((item) => item.data.type === 'effect')
                ?.find((item) => item.data.data.slug === 'spell-effect-mage-armor');
            if (mageArmor) {
                mageArmorBonus = mageArmor.data.data.level.value === 10 ? 3 : mageArmor.data.data.level.value >= 5 ? 2 : 1;
            }
            let itemBonus = Math.max(bracers, clothingPotency, mageArmorBonus);
            const rule = effect.data.rules.find(
                (r) => r.selector === 'ac' && r.key === 'PF2E.RuleElement.FlatModifier',
            );
            if (rule) {
                rule.value = rule.value + itemBonus;
            }
            token.actor.createOwnedItem(effect);
        }
    }
})();
