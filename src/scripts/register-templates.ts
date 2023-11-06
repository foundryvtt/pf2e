/** Register Handlebars template partials */
export function registerTemplates(): void {
    const templatePaths = [
        // Dice
        "systems/pf2e/templates/chat/check/roll.hbs",
        "systems/pf2e/templates/chat/check/target-dc-result.hbs",
        "systems/pf2e/templates/chat/damage/damage-taken.hbs",
        "systems/pf2e/templates/dice/damage-roll.hbs",
        "systems/pf2e/templates/dice/damage-tooltip.hbs",

        // PC Sheet Tooltips and Section Partials
        "systems/pf2e/templates/actors/character/partials/elemental-blast.hbs",
        "systems/pf2e/templates/actors/character/partials/feat-slot.hbs",
        "systems/pf2e/templates/actors/character/partials/header.hbs",
        "systems/pf2e/templates/actors/character/partials/sidebar.hbs",
        "systems/pf2e/templates/actors/character/partials/strike.hbs",

        // PC Sheet Tabs
        "systems/pf2e/templates/actors/character/tabs/general.hbs",
        "systems/pf2e/templates/actors/character/tabs/actions.hbs",
        "systems/pf2e/templates/actors/character/tabs/biography.hbs",
        "systems/pf2e/templates/actors/character/tabs/effects.hbs",
        "systems/pf2e/templates/actors/character/tabs/feats.hbs",
        "systems/pf2e/templates/actors/character/tabs/inventory.hbs",
        "systems/pf2e/templates/actors/character/tabs/pfs.hbs",
        "systems/pf2e/templates/actors/character/tabs/proficiencies.hbs",
        "systems/pf2e/templates/actors/character/tabs/spellcasting.hbs",
        "systems/pf2e/templates/actors/character/tabs/crafting.hbs",

        // Hazard Sheets Partials
        "systems/pf2e/templates/actors/hazard/partials/header.hbs",
        "systems/pf2e/templates/actors/hazard/partials/sidebar.hbs",

        // Kingdom Sheet Partials
        "systems/pf2e/templates/actors/party/kingdom/tabs/main.hbs",
        "systems/pf2e/templates/actors/party/kingdom/tabs/activities.hbs",
        "systems/pf2e/templates/actors/party/kingdom/tabs/world.hbs",
        "systems/pf2e/templates/actors/party/kingdom/tabs/features.hbs",
        "systems/pf2e/templates/actors/party/kingdom/tabs/ongoing.hbs",
        "systems/pf2e/templates/actors/party/kingdom/partials/build-entry-boosts.hbs",
        "systems/pf2e/templates/actors/party/kingdom/partials/settlement.hbs",

        // Shared Actor Sheet Partials
        "systems/pf2e/templates/actors/partials/action.hbs",
        "systems/pf2e/templates/actors/partials/carry-type.hbs",
        "systems/pf2e/templates/actors/partials/coinage.hbs",
        "systems/pf2e/templates/actors/partials/dying-pips.hbs",
        "systems/pf2e/templates/actors/partials/effects.hbs",
        "systems/pf2e/templates/actors/partials/encumbrance.hbs",
        "systems/pf2e/templates/actors/partials/inventory.hbs",
        "systems/pf2e/templates/actors/partials/item-line.hbs",
        "systems/pf2e/templates/actors/partials/modifiers-tooltip.hbs",
        "systems/pf2e/templates/actors/partials/toggles.hbs",
        "systems/pf2e/templates/actors/partials/total-bulk.hbs",
        "systems/pf2e/templates/actors/crafting-entry-alchemical.hbs",
        "systems/pf2e/templates/actors/crafting-entry-list.hbs",
        "systems/pf2e/templates/actors/spell-collection.hbs",
        "systems/pf2e/templates/actors/character/partials/proficiencylevels-dropdown.hbs",

        // SVG icons
        "systems/pf2e/templates/actors/character/icons/d20.hbs",
        "systems/pf2e/templates/actors/character/icons/pfs.hbs",
        "systems/pf2e/templates/actors/character/icons/plus.hbs",

        // Actor Sheet Partials (SVG images)
        "systems/pf2e/templates/actors/partials/images/header_stroke.hbs",
        "systems/pf2e/templates/actors/partials/images/header_stroke_large.hbs",

        // NPC partials
        "systems/pf2e/templates/actors/npc/tabs/main.hbs",
        "systems/pf2e/templates/actors/npc/tabs/inventory.hbs",
        "systems/pf2e/templates/actors/npc/tabs/effects.hbs",
        "systems/pf2e/templates/actors/npc/tabs/spells.hbs",
        "systems/pf2e/templates/actors/npc/tabs/notes.hbs",
        "systems/pf2e/templates/actors/npc/partials/header.hbs",
        "systems/pf2e/templates/actors/npc/partials/sidebar.hbs",
        "systems/pf2e/templates/actors/npc/partials/action.hbs",
        "systems/pf2e/templates/actors/npc/partials/attack.hbs",

        // Item Sheet Partials
        "systems/pf2e/templates/items/action-details.hbs",
        "systems/pf2e/templates/items/action-sidebar.hbs",
        "systems/pf2e/templates/items/activation-panel.hbs",
        "systems/pf2e/templates/items/affliction-details.hbs",
        "systems/pf2e/templates/items/affliction-sidebar.hbs",
        "systems/pf2e/templates/items/ancestry-details.hbs",
        "systems/pf2e/templates/items/ancestry-sidebar.hbs",
        "systems/pf2e/templates/items/armor-details.hbs",
        "systems/pf2e/templates/items/armor-sidebar.hbs",
        "systems/pf2e/templates/items/background-details.hbs",
        "systems/pf2e/templates/items/backpack-details.hbs",
        "systems/pf2e/templates/items/backpack-sidebar.hbs",
        "systems/pf2e/templates/items/book-details.hbs",
        "systems/pf2e/templates/items/book-sidebar.hbs",
        "systems/pf2e/templates/items/campaign-feature-details.hbs",
        "systems/pf2e/templates/items/campaign-feature-sidebar.hbs",
        "systems/pf2e/templates/items/class-details.hbs",
        "systems/pf2e/templates/items/condition-details.hbs",
        "systems/pf2e/templates/items/condition-sidebar.hbs",
        "systems/pf2e/templates/items/consumable-details.hbs",
        "systems/pf2e/templates/items/consumable-sidebar.hbs",
        "systems/pf2e/templates/items/deity-details.hbs",
        "systems/pf2e/templates/items/effect-details.hbs",
        "systems/pf2e/templates/items/effect-sidebar.hbs",
        "systems/pf2e/templates/items/equipment-details.hbs",
        "systems/pf2e/templates/items/equipment-sidebar.hbs",
        "systems/pf2e/templates/items/feat-details.hbs",
        "systems/pf2e/templates/items/feat-sidebar.hbs",
        "systems/pf2e/templates/items/heritage-details.hbs",
        "systems/pf2e/templates/items/heritage-sidebar.hbs",
        "systems/pf2e/templates/items/kit-details.hbs",
        "systems/pf2e/templates/items/kit-sidebar.hbs",
        "systems/pf2e/templates/items/lore-details.hbs",
        "systems/pf2e/templates/items/lore-sidebar.hbs",
        "systems/pf2e/templates/items/melee-details.hbs",
        "systems/pf2e/templates/items/mystify-panel.hbs",
        "systems/pf2e/templates/items/rules-panel.hbs",
        "systems/pf2e/templates/items/spell-details.hbs",
        "systems/pf2e/templates/items/spell-overlay.hbs",
        "systems/pf2e/templates/items/spell-sidebar.hbs",
        "systems/pf2e/templates/items/treasure-details.hbs",
        "systems/pf2e/templates/items/treasure-sidebar.hbs",
        "systems/pf2e/templates/items/weapon-details.hbs",
        "systems/pf2e/templates/items/weapon-sidebar.hbs",

        // Item Sheet Partials (sub-partials)
        "systems/pf2e/templates/items/partials/ability-activation.hbs",
        "systems/pf2e/templates/items/partials/duration.hbs",
        "systems/pf2e/templates/items/partials/other-tags.hbs",
        "systems/pf2e/templates/items/partials/self-applied-effect.hbs",

        // Loot partials
        "systems/pf2e/templates/actors/loot/inventory.hbs",
        "systems/pf2e/templates/actors/loot/sidebar.hbs",

        // Vehicle partials
        "systems/pf2e/templates/actors/vehicle/vehicle-header.hbs",
        "systems/pf2e/templates/actors/vehicle/sidebar.hbs",
        "systems/pf2e/templates/actors/vehicle/tabs/details.hbs",
        "systems/pf2e/templates/actors/vehicle/tabs/actions.hbs",
        "systems/pf2e/templates/actors/vehicle/tabs/inventory.hbs",
        "systems/pf2e/templates/actors/vehicle/tabs/description.hbs",
        "systems/pf2e/templates/actors/vehicle/tabs/effects.hbs",

        // Compendium Browser Partials
        "systems/pf2e/templates/compendium-browser/settings/settings.hbs",
        "systems/pf2e/templates/compendium-browser/settings/pack-settings.hbs",
        "systems/pf2e/templates/compendium-browser/settings/source-settings.hbs",
        "systems/pf2e/templates/compendium-browser/filters.hbs",

        // Action Partial
        "systems/pf2e/templates/chat/action/header.hbs",
        "systems/pf2e/templates/system/actions/repair/chat-button-partial.hbs",
        "systems/pf2e/templates/system/actions/repair/repair-result-partial.hbs",
        "systems/pf2e/templates/system/actions/repair/item-heading-partial.hbs",

        // TokenConfig partials
        "systems/pf2e/templates/scene/token/partials/appearance.hbs",
        "systems/pf2e/templates/scene/token/partials/identity.hbs",
        "systems/pf2e/templates/scene/token/partials/lighting.hbs",

        // Partials for multiple document types
        "systems/pf2e/templates/partials/publication-data.hbs",
    ];

    loadTemplates(templatePaths);
}
