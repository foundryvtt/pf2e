/**
 * @format
 */

export default function () {
    const templatePaths = [
        // Actor Sheets Partials (CRB-Style Tooltip)
        'systems/pf2e/templates/actors/crb-style/partials/modifiers-tooltip.html',

        // Actor Sheets Partials (CRB-Syle Sidebar)
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-armorclass.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-class-dc.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-health.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-stamina.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-resistances.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-perception.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-initiative.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-saves.html',
        'systems/pf2e/templates/actors/crb-style/sidebar/actor-ability-scores.html',

        // Actor Sheets Partials (CRB-Style Main Section)
        'systems/pf2e/templates/actors/crb-style/actor-header.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-character.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-actions.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-biography.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-feats.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-inventory.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-skills.html',
        'systems/pf2e/templates/actors/crb-style/tabs/actor-spellbook.html',
        'systems/pf2e/templates/actors/crb-style/tabs/item-line.html',
        'systems/pf2e/templates/actors/crb-style/character-traits.html',
        'systems/pf2e/templates/actors/crb-style/character-abilities.html',

        // Item Sheet Partials
        'systems/pf2e/templates/items/action-details.html',
        'systems/pf2e/templates/items/action-sidebar.html',
        'systems/pf2e/templates/items/armor-details.html',
        'systems/pf2e/templates/items/armor-sidebar.html',
        'systems/pf2e/templates/items/backpack-details.html',
        'systems/pf2e/templates/items/backpack-sidebar.html',
        'systems/pf2e/templates/items/treasure-sidebar.html',
        'systems/pf2e/templates/items/class-sidebar.html',
        'systems/pf2e/templates/items/consumable-details.html',
        'systems/pf2e/templates/items/consumable-sidebar.html',
        'systems/pf2e/templates/items/condition-details.html',
        'systems/pf2e/templates/items/condition-sidebar.html',
        'systems/pf2e/templates/items/equipment-details.html',
        'systems/pf2e/templates/items/equipment-sidebar.html',
        'systems/pf2e/templates/items/feat-details.html',
        'systems/pf2e/templates/items/feat-sidebar.html',
        'systems/pf2e/templates/items/kit-details.html',
        'systems/pf2e/templates/items/kit-sidebar.html',
        'systems/pf2e/templates/items/lore-sidebar.html',
        'systems/pf2e/templates/items/spell-details.html',
        'systems/pf2e/templates/items/spell-sidebar.html',
        'systems/pf2e/templates/items/tool-sidebar.html',
        'systems/pf2e/templates/items/melee-details.html',
        'systems/pf2e/templates/items/weapon-details.html',
        'systems/pf2e/templates/items/weapon-sidebar.html',
        // Loot partials
        'systems/pf2e/templates/actors/loot/loot-avatar.html',
        'systems/pf2e/templates/actors/loot/loot-inventory.html',

        // Compendium Browser Partials
        'systems/pf2e/templates/packs/action-browser.html',
        'systems/pf2e/templates/packs/bestiary-browser.html',
        'systems/pf2e/templates/packs/inventory-browser.html',
        'systems/pf2e/templates/packs/feat-browser.html',
        'systems/pf2e/templates/packs/hazard-browser.html',
        'systems/pf2e/templates/packs/spell-browser.html',
        'systems/pf2e/templates/packs/browser-settings.html',
    ];
    return loadTemplates(templatePaths);
}
