/** Register Handlebars template partials */
export function registerTemplates(): void {
    const templatePaths = [
        // PC Sheet Tooltips
        "systems/pf2e/templates/actors/character/partials/modifiers-tooltip.html",
        "systems/pf2e/templates/actors/character/partials/traits.html",
        "systems/pf2e/templates/actors/character/partials/background.html",
        "systems/pf2e/templates/actors/character/partials/abilities.html",
        "systems/pf2e/templates/actors/character/partials/header.html",
        "systems/pf2e/templates/actors/character/partials/granted-feat.html",

        // PC Sheet Sidebar
        "systems/pf2e/templates/actors/character/sidebar/armor-class.html",
        "systems/pf2e/templates/actors/character/sidebar/class-dc.html",
        "systems/pf2e/templates/actors/character/sidebar/health.html",
        "systems/pf2e/templates/actors/character/sidebar/stamina.html",
        "systems/pf2e/templates/actors/character/sidebar/resistances.html",
        "systems/pf2e/templates/actors/character/sidebar/perception.html",
        "systems/pf2e/templates/actors/character/sidebar/initiative.html",
        "systems/pf2e/templates/actors/character/sidebar/saves.html",

        // PC Sheet Tabs
        "systems/pf2e/templates/actors/character/tabs/general.html",
        "systems/pf2e/templates/actors/character/tabs/actions.html",
        "systems/pf2e/templates/actors/character/tabs/biography.html",
        "systems/pf2e/templates/actors/character/tabs/effects.html",
        "systems/pf2e/templates/actors/character/tabs/feats.html",
        "systems/pf2e/templates/actors/character/tabs/inventory.html",
        "systems/pf2e/templates/actors/character/tabs/pfs.html",
        "systems/pf2e/templates/actors/character/tabs/proficiencies.html",
        "systems/pf2e/templates/actors/character/tabs/spellcasting.html",
        "systems/pf2e/templates/actors/character/tabs/crafting.html",

        // Hazard Sheets Partials
        "systems/pf2e/templates/actors/hazard/partials/header.html",
        "systems/pf2e/templates/actors/hazard/partials/sidebar.html",

        // Shared Actor Sheet Partials
        "systems/pf2e/templates/actors/partials/coinage.html",
        "systems/pf2e/templates/actors/partials/inventory.html",
        "systems/pf2e/templates/actors/partials/item-line.html",
        "systems/pf2e/templates/actors/partials/carry-type.html",
        "systems/pf2e/templates/actors/partials/conditions.html",
        "systems/pf2e/templates/actors/partials/dying-pips.html",
        "systems/pf2e/templates/actors/crafting-entry-alchemical.html",
        "systems/pf2e/templates/actors/crafting-entry-list.html",
        "systems/pf2e/templates/actors/spellcasting-spell-list.html",
        "systems/pf2e/templates/actors/character/partials/proficiencylevels-dropdown.html",

        // SVG icons
        "systems/pf2e/templates/actors/character/icons/d20.html",
        "systems/pf2e/templates/actors/character/icons/pfs.html",
        "systems/pf2e/templates/actors/character/icons/plus.html",

        // Actor Sheet Partials (SVG images)
        "systems/pf2e/templates/actors/partials/images/header_stroke.html",
        "systems/pf2e/templates/actors/partials/images/header_stroke_large.html",

        // NPC partials
        "systems/pf2e/templates/actors/npc/tabs/main.html",
        "systems/pf2e/templates/actors/npc/tabs/inventory.html",
        "systems/pf2e/templates/actors/npc/tabs/effects.html",
        "systems/pf2e/templates/actors/npc/tabs/spells.html",
        "systems/pf2e/templates/actors/npc/tabs/notes.html",
        "systems/pf2e/templates/actors/npc/partials/header.html",
        "systems/pf2e/templates/actors/npc/partials/sidebar.html",
        "systems/pf2e/templates/actors/npc/partials/action.html",
        "systems/pf2e/templates/actors/npc/partials/attack.html",

        // Item Sheet Partials
        "systems/pf2e/templates/items/rules-panel.html",
        "systems/pf2e/templates/items/action-details.html",
        "systems/pf2e/templates/items/ancestry-details.html",
        "systems/pf2e/templates/items/ancestry-sidebar.html",
        "systems/pf2e/templates/items/armor-details.html",
        "systems/pf2e/templates/items/armor-sidebar.html",
        "systems/pf2e/templates/items/background-details.html",
        "systems/pf2e/templates/items/backpack-details.html",
        "systems/pf2e/templates/items/backpack-sidebar.html",
        "systems/pf2e/templates/items/book-details.html",
        "systems/pf2e/templates/items/book-sidebar.html",
        "systems/pf2e/templates/items/treasure-sidebar.html",
        "systems/pf2e/templates/items/class-details.html",
        "systems/pf2e/templates/items/consumable-details.html",
        "systems/pf2e/templates/items/consumable-sidebar.html",
        "systems/pf2e/templates/items/condition-details.html",
        "systems/pf2e/templates/items/condition-sidebar.html",
        "systems/pf2e/templates/items/deity-details.html",
        "systems/pf2e/templates/items/effect-sidebar.html",
        "systems/pf2e/templates/items/equipment-details.html",
        "systems/pf2e/templates/items/equipment-sidebar.html",
        "systems/pf2e/templates/items/feat-details.html",
        "systems/pf2e/templates/items/feat-sidebar.html",
        "systems/pf2e/templates/items/heritage-sidebar.html",
        "systems/pf2e/templates/items/kit-details.html",
        "systems/pf2e/templates/items/kit-sidebar.html",
        "systems/pf2e/templates/items/lore-details.html",
        "systems/pf2e/templates/items/lore-sidebar.html",
        "systems/pf2e/templates/items/mystify-panel.html",
        "systems/pf2e/templates/items/spell-details.html",
        "systems/pf2e/templates/items/spell-overlay.html",
        "systems/pf2e/templates/items/spell-sidebar.html",
        "systems/pf2e/templates/items/melee-details.html",
        "systems/pf2e/templates/items/weapon-details.html",
        "systems/pf2e/templates/items/weapon-sidebar.html",
        "systems/pf2e/templates/items/activation-panel.html",

        // Item Sheet Partials (sub-partials)
        "systems/pf2e/templates/items/partials/ability-activation.html",

        // Loot partials
        "systems/pf2e/templates/actors/loot/inventory.html",
        "systems/pf2e/templates/actors/loot/sidebar.html",

        // Vehicle partials
        "systems/pf2e/templates/actors/vehicle/vehicle-sheet.html",
        "systems/pf2e/templates/actors/vehicle/vehicle-header.html",
        "systems/pf2e/templates/actors/vehicle/sidebar/vehicle-health.html",
        "systems/pf2e/templates/actors/vehicle/sidebar/vehicle-armorclass.html",
        "systems/pf2e/templates/actors/vehicle/sidebar/vehicle-saves.html",
        "systems/pf2e/templates/actors/vehicle/sidebar/vehicle-resistances.html",
        "systems/pf2e/templates/actors/vehicle/tabs/vehicle-details.html",
        "systems/pf2e/templates/actors/vehicle/tabs/vehicle-actions.html",
        "systems/pf2e/templates/actors/vehicle/tabs/vehicle-inventory.html",
        "systems/pf2e/templates/actors/vehicle/tabs/vehicle-description.html",

        // Compendium Browser Partials
        "systems/pf2e/templates/compendium-browser/browser-settings.html",
        "systems/pf2e/templates/compendium-browser/filters.html",

        // Action Partial
        "systems/pf2e/templates/system/actions/repair/chat-button-partial.html",
        "systems/pf2e/templates/system/actions/repair/repair-result-partial.html",
        "systems/pf2e/templates/system/actions/repair/item-heading-partial.html",

        // TokenConfig partials
        "systems/pf2e/templates/scene/token/partials/appearance.html",
        "systems/pf2e/templates/scene/token/partials/identity.html",
        "systems/pf2e/templates/scene/token/partials/lighting.html",
    ];

    loadTemplates(templatePaths);
}
