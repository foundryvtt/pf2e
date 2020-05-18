/**
 * @format
 */

export default function () {
    const templatePaths = [
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
        'systems/pf2e/templates/actors/crb-style/character-traits.html',
        'systems/pf2e/templates/actors/crb-style/character-abilities.html',

        // Actor Sheet Partials (Main)
        'systems/pf2e/templates/actors/main/actor-header.html',
        'systems/pf2e/templates/actors/main/actor-armorclass.html',
        'systems/pf2e/templates/actors/main/actor-class-dc.html',
        'systems/pf2e/templates/actors/main/actor-health.html',
        'systems/pf2e/templates/actors/main/actor-stamina.html',
        'systems/pf2e/templates/actors/main/actor-resistances.html',
        'systems/pf2e/templates/actors/main/actor-perception.html',
        'systems/pf2e/templates/actors/main/actor-initiative.html',
        'systems/pf2e/templates/actors/main/actor-saves.html',
        'systems/pf2e/templates/actors/main/actor-ability-scores.html',
        // Actor Sheet Partials (Tabs)
        'systems/pf2e/templates/actors/tabs/actor-actions.html',
        'systems/pf2e/templates/actors/tabs/actor-biography.html',
        'systems/pf2e/templates/actors/tabs/actor-feats.html',
        'systems/pf2e/templates/actors/tabs/actor-inventory.html',
        'systems/pf2e/templates/actors/tabs/actor-skills.html',
        'systems/pf2e/templates/actors/tabs/actor-spellbook.html',

        // Actor Sheet Partials (Legacy)
        'systems/pf2e/templates/actors/actor-attributes.html',
        'systems/pf2e/templates/actors/actor-abilities.html',
        'systems/pf2e/templates/actors/actor-traits.html',
        'systems/pf2e/templates/actors/actor-classes.html',

        // Item Sheet Partials
        'systems/pf2e/templates/items/action-details.html',
        'systems/pf2e/templates/items/action-sidebar.html',
        'systems/pf2e/templates/items/armor-details.html',
        'systems/pf2e/templates/items/armor-sidebar.html',
        'systems/pf2e/templates/items/backpack-details.html',
        'systems/pf2e/templates/items/backpack-sidebar.html',
        'systems/pf2e/templates/items/class-sidebar.html',
        'systems/pf2e/templates/items/consumable-details.html',
        'systems/pf2e/templates/items/consumable-sidebar.html',
        'systems/pf2e/templates/items/equipment-details.html',
        'systems/pf2e/templates/items/equipment-sidebar.html',
        'systems/pf2e/templates/items/feat-details.html',
        'systems/pf2e/templates/items/feat-sidebar.html',
        'systems/pf2e/templates/items/lore-sidebar.html',
        'systems/pf2e/templates/items/spell-details.html',
        'systems/pf2e/templates/items/spell-sidebar.html',
        'systems/pf2e/templates/items/tool-sidebar.html',
        'systems/pf2e/templates/items/melee-details.html',
        'systems/pf2e/templates/items/weapon-details.html',
        'systems/pf2e/templates/items/weapon-sidebar.html',
    ];
    return loadTemplates(templatePaths);
}
