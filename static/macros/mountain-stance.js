// Stance: Mountain Stance
const ITEM_UUID = checkFeat("mountain-quake")
    ? "Compendium.pf2e.feat-effects.wuERa7exfXXl6I37"
    : checkFeat("mountain-stronghold")
    ? "Compendium.pf2e.feat-effects.LXbVcutEIW8eWZEz"
    : checkFeat("mountain-stance")
    ? "Compendium.pf2e.feat-effects.gYpy9XBPScIlY93p"
    : null;

if (token?.actor?.type !== "character") {
    ui.notifications.error("PF2e System | Select exactly one player-character token.");
} else if (ITEM_UUID === null) {
    ui.notifications.warn(`PF2e System | ${token.actor.name} does not have the Mountain Stance feat`);
} else {
    await applyEffect(ITEM_UUID);
}

function checkFeat(slug) {
    return !!token?.actor?.itemTypes.feat.some((i) => i.slug === slug);
}

async function applyEffect(effectUUID) {
    const { actor } = token;
    const { itemTypes } = actor;
    const existing = itemTypes.effect.find((e) => e.sourceId === effectUUID);
    if (existing) {
        await actor.deleteEmbeddedDocuments("Item", [existing.id]);
        return;
    }

    const effect = (await fromUuid(effectUUID)).toObject();
    effect.flags.core = effect.flags.core ?? {};
    effect.flags.core.sourceId = effect.flags.core.sourceId ?? effectUUID;

    const clothing = itemTypes.armor.find((i) => i.slug === "clothing-explorers" && i.isEquipped);
    const clothingBonus = clothing?.data.data.runes.potency ?? 0;
    const bracers = itemTypes.equipment.find((i) => i.isInvested && i.slug.startsWith("bracers-of-armor-"));
    const bracersBonus = !bracers ? 0 : bracers.slug.endsWith("-i") ? 1 : bracers.slug.endsWith("-ii") ? 2 : 3;
    const mageArmor = itemTypes.effect.find((i) => i.slug === "spell-effect-mage-armor");
    const mageArmorBonus = !mageArmor ? 0 : mageArmor.level === 10 ? 3 : mageArmor.level >= 5 ? 2 : 1;

    const itemBonus = Math.max(clothingBonus, bracersBonus, mageArmorBonus);
    const rule = effect.data.rules.find((r) => r.selector === "ac" && r.key === "FlatModifier");
    rule.value = rule.value + itemBonus;
    await actor.createEmbeddedDocuments("Item", [effect]);
}
