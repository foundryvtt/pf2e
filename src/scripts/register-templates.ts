/** Register Handlebars template partials */
export function registerTemplates(): void {
    const templatePaths = [
        // Dice
        "chat/check/roll.hbs",
        "chat/check/target-dc-result.hbs",
        "chat/damage/damage-taken.hbs",
        "dice/damage-roll.hbs",
        "dice/damage-tooltip.hbs",

        // PC Sheet Tooltips and Section Partials
        "actors/character/partials/elemental-blast.hbs",
        "actors/character/partials/feat-slot.hbs",
        "actors/character/partials/header.hbs",
        "actors/character/partials/sidebar.hbs",
        "actors/character/partials/strike.hbs",

        // PC Sheet Tabs
        "actors/character/tabs/actions.hbs",
        "actors/character/tabs/biography.hbs",
        "actors/character/tabs/character.hbs",
        "actors/character/tabs/crafting.hbs",
        "actors/character/tabs/effects.hbs",
        "actors/character/tabs/feats.hbs",
        "actors/character/tabs/inventory.hbs",
        "actors/character/tabs/pfs.hbs",
        "actors/character/tabs/proficiencies.hbs",
        "actors/character/tabs/spellcasting.hbs",

        // Hazard Sheets Partials
        "actors/hazard/partials/header.hbs",
        "actors/hazard/partials/sidebar.hbs",

        // Kingdom Sheet Partials
        "actors/party/kingdom/tabs/main.hbs",
        "actors/party/kingdom/tabs/activities.hbs",
        "actors/party/kingdom/tabs/world.hbs",
        "actors/party/kingdom/tabs/features.hbs",
        "actors/party/kingdom/tabs/ongoing.hbs",
        "actors/party/kingdom/partials/build-entry-boosts.hbs",
        "actors/party/kingdom/partials/settlement.hbs",

        // Shared Actor Sheet Partials
        "actors/partials/action.hbs",
        "actors/partials/carry-type.hbs",
        "actors/partials/coinage.hbs",
        "actors/partials/dying-pips.hbs",
        "actors/partials/effects.hbs",
        "actors/partials/encumbrance.hbs",
        "actors/partials/inventory-header.hbs",
        "actors/partials/inventory.hbs",
        "actors/partials/item-line.hbs",
        "actors/partials/modifiers-tooltip.hbs",
        "actors/partials/spell-collection.hbs",
        "actors/partials/toggles.hbs",
        "actors/partials/total-bulk.hbs",
        "actors/character/partials/proficiencylevels-dropdown.hbs",

        // SVG icons
        "actors/character/icons/d20.hbs",
        "actors/character/icons/pfs.hbs",
        "actors/character/icons/plus.hbs",

        // NPC partials
        "actors/npc/tabs/main.hbs",
        "actors/npc/tabs/inventory.hbs",
        "actors/npc/tabs/effects.hbs",
        "actors/npc/tabs/spells.hbs",
        "actors/npc/tabs/notes.hbs",
        "actors/npc/partials/header.hbs",
        "actors/npc/partials/sidebar.hbs",
        "actors/npc/partials/action.hbs",
        "actors/npc/partials/attack.hbs",

        // Item Sheet Partials
        "items/action-details.hbs",
        "items/action-sidebar.hbs",
        "items/affliction-details.hbs",
        "items/affliction-sidebar.hbs",
        "items/ammo-details.hbs",
        "items/ancestry-details.hbs",
        "items/ancestry-sidebar.hbs",
        "items/armor-details.hbs",
        "items/background-details.hbs",
        "items/backpack-details.hbs",
        "items/book-details.hbs",
        "items/campaign-feature-details.hbs",
        "items/campaign-feature-sidebar.hbs",
        "items/class-details.hbs",
        "items/condition-details.hbs",
        "items/condition-sidebar.hbs",
        "items/consumable-details.hbs",
        "items/deity-details.hbs",
        "items/effect-details.hbs",
        "items/effect-sidebar.hbs",
        "items/equipment-details.hbs",
        "items/feat-details.hbs",
        "items/feat-sidebar.hbs",
        "items/heritage-details.hbs",
        "items/heritage-sidebar.hbs",
        "items/kit-details.hbs",
        "items/lore-details.hbs",
        "items/melee-details.hbs",
        "items/mystify-panel.hbs",
        "items/physical-sidebar.hbs",
        "items/rules-panel.hbs",
        "items/shield-details.hbs",
        "items/spell-details.hbs",
        "items/spell-overlay.hbs",
        "items/treasure-details.hbs",
        "items/weapon-details.hbs",

        // Item Sheet Partials (sub-partials)
        "items/partials/ability-activation.hbs",
        "items/partials/addendum.hbs",
        "items/partials/apex.hbs",
        "items/partials/duration.hbs",
        "items/partials/other-tags.hbs",
        "items/partials/self-applied-effect.hbs",

        // Loot partials
        "actors/loot/inventory.hbs",
        "actors/loot/sidebar.hbs",

        // Vehicle partials
        "actors/vehicle/vehicle-header.hbs",
        "actors/vehicle/sidebar.hbs",
        "actors/vehicle/tabs/details.hbs",
        "actors/vehicle/tabs/actions.hbs",
        "actors/vehicle/tabs/inventory.hbs",
        "actors/vehicle/tabs/description.hbs",
        "actors/vehicle/tabs/effects.hbs",

        // Compendium Browser Partials
        "compendium-browser/settings/settings.hbs",
        "compendium-browser/settings/pack-settings.hbs",
        "compendium-browser/settings/source-settings.hbs",

        // Action Partial
        "chat/action/header.hbs",
        "system/actions/repair/chat-button-partial.hbs",
        "system/actions/repair/repair-result-partial.hbs",
        "system/actions/repair/item-heading-partial.hbs",

        // Partials for multiple document types
        "partials/publication-data.hbs",

        // misc partials
        "system/settings/basic-setting.hbs",
    ].map((t) => `${SYSTEM_ROOT}/templates/${t}`);

    fa.handlebars.loadTemplates(templatePaths);
}
