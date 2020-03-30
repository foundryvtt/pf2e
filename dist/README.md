# Pathfinder Second Edition System

This system adds support for Pathfinder Second Edition to Foundry VTT.

### PF2e Version
This is the initial alpha release of the Pathfinder Second Edition system.

Patch Notes:
*  v0.521: Fixed bug preventing a characters sheet from loading when the actor has an Archetype feat


Please Note:
- Functionality is not complete with plenty of work remaining. 
- If you find any issues or have any feedback please let me know.

### FVTT Version:
- Tested with FVTT v0.5.1.

### Installation Instructions

To install the system, follow these instructions:

1. Start FVTT and browse to the Game Systems tab in the Configuration and Setup menu
2. Select the Install System button and enter the following URL: https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/raw/master/system.json
3. Click Install and wait for installation to complete
4. Create a new world using the PF2e system.

### Shoutouts

A huge thanks to:
- @FrisGuardian#8347 for cleaing up some of the UI in the project!
- @ohporter for getting involved and fixing issues with the roll logic
- Trey#9048 for picking up the project where I had left it, fixing some anoying bugs and adding new features all in a matter of days!
- FS#5443 for the addition of multi-attack buttons!
- Overdox#9174 for contributing hugely to the SRD compendium packs!
- @fyjham-ts https://github.com/fyjham-ts/Pathfinder-2E-Spell-DB for the raw data I used (and FS#5443 for pointing me to it).
- Felix#6196 for the creation of Spell Browser (https://github.com/syl3r86/Spell-Browser) and kind permission to allow me to incorporate it into this system.
- fryguy#3851 for contributing to the project with improvements to the NPC sheet!
- Moo Man#7518  and CatoThe1stElder#9725 for the wfrp4e system which I used for inspiration on my inventory onDrop method.
- u/baughberick (https://www.reddit.com/user/baughberick/) for the creation of the Pathfinder2eActions font.

### Feedback

If you have any suggestions or feedback, please contact me on discord (hooking#0492)

### License

This work is a package for the Foundry Virtual Tabletop software with the following license: [Limited License Agreement for module development 09/02/2020](https://foundryvtt.com/article/license/).
All HTML, CSS and Javascript in this project is licensed under the Apache License v2.
The Pathfinder Second Edition system information and compendium JSON data is licensed under the Open Game License (OPEN GAME LICENSE Version 1.0a).
License information for the art used in the compendium packs distributed with this project is included in the ./packs/ folder alongside the JSON of the compendium pack.


### Prior Patch Changes:
*  v0.520: Fixed errors loading character sheets when a spell has a level higher than 10 (or 11).
*  v0.520: Removed focus spells as a special type of spell level. Focus spells will now need to be migrated to a separate Focus spellcasting entry
*  v0.519: (@overdox) Added spell and feat compendium packs for Lost Omens Character Guide, Lost Omens Gods and Magic and Lost Omens World Guide.
*  v0.519: (@overdox) Added missing spell and feat traits
*  v0.519: (@overdox) Added settings for additional spell heitening levels (these don't do anything yet but they can be configured now and will work later)
*  v0.518: (issue #74) Added the Precision trait.
*  v0.517: (issue #85) Added additional traits to feats list.
*  v0.516: Fixed item macros not functioning correctly
*  v0.515: (issue #80) Fixed bug with spells not showing the correct DC in item summary or chat cards.
*  v0.515: (issue #74) Added missing traits for actions and weapons
*  v0.515: (issue #73) Fixes bulk from coins not calculating correctly
*  v0.515: (issue #75) Added the ability to add, edit and remove items on NPC sheets.
*  v0.514: Fixed bug with NPC attack rolls
*  v0.513: Added support for custom martial skills allowing characters to add martial skills for specific weapons
*  v0.512: Fixed the calculation of weapon attack rolls with the Finesse trait
*  v0.511: Set default NPC alignment to Neutral (rather than null)
*  v0.511: Continued to add localization support for the NPC sheet
*  v0.511: Added a attackRoll label to the item summary for PC weapons so players know the modifiers before they roll.
*  v0.511: Enabled the modification of NPC alignment and trait information (which is reflected in the read-only NPC sheet)
*  v0.511: Added a Bestiary Browser button to the Actor Directory tab (next to the Create Actor button)
*  v0.511: Fixed an issue with the read-only NPC sheet when a monster had a large list of traits causing the Current HP to slide off the side of the window
*  v0.511: added an initial imlementation of displaying NPC action and weapon traits on the read-only sheet (would like feedback here).
*  v0.510: Fixed an issue with the item sheet values for weapon abilities and spell saves which was affecting several rolls.
*  v0.509: Fixed bug with updated NPC sheet not loading for old NPCs and added a edit toggle to easily swap between sheets.
*  v0.508: (@FrisGuardian#8347) Added an alchemic items compendium pack. Thanks!!
*  v0.507: Added Bestiary Browser with a few filters and sorting options. Welcome feedback here as I can add additional filters etc.
*  v0.507: Fixed other move speeds for NPC in the bestiary and updated the read-only sheet to show the new data.
*  v0.506: Updated bestiary to fix issue with items, damage immunities/resistances/vulnerabilities, alignment plus more.
*  v0.506: Added a new read-only NPC sheet. A super huge thanks to @FS for doing 99% of the work here.
*  v0.505: Updated beastiary to include correct images and separate NPC ranged and melee attacks.
*  v0.504: Added a beastiary compendium pack!! (A huge thanks to @fs#5443 for putting in most of the hard work on this)
*  v0.504: Fixed a lot of small issues with the NPC data model
*  v0.504: Made several improvements to the pf2e template to support damage resistances, weaknesses, etc. different speed types and a lot of additional NPC data.
*  v0.500: Added support for Foundry VTT v0.5.0 (please backup your world before updating)
*  v0.500: Added support for localisation and localised most labels in all of the pf2e html temlplates as well as attribute, saves and skill names.
*  v0.500: Fixed issues with NPC sheets and prepared spellcasting entrys
*  v0.500: Fixed multiple issues with dragging and dropping spells onto character sheets
*  v0.465: (Trey#9048) Added an actions compendium.
*  v0.465: Re-orded the filter groups in Action Browser
*  v0.465: Added a link directly to the Action Browser from the action tab in character sheets
*  v0.465: (Trey#9048) Saved scroll position when managing prepared spells (huge QoL improvement!!)
*  v0.465: Fixed bug when dragging spells from a compendium onto an NPC sheet.
*  v0.464: (Trey#9048) Incorporated eslint and started moving the pf2e system to use es6 style modules.
*  v0.464: (Trey#9048) Fixed an issue with the Action Browser compendium pack settings
*  v0.463: (Trey#9048) Fixed issue with out dated system.json in deployment package.
*  v0.462: Fixed bug when rolling initiative for NPCs using the combat tracker. 
*  v0.462: Set the placeholder for NPC perception, saves and attack bonus to 0 to reflect the actual values.
*  v0.460: (Trey#9048) Added a new automated deployment process to build, package and publish pf2e system changes. Thanks!!!
*  v0.456: (Trey#9048) Added Action Browser - a way to search and filter for actions from selected compendium packs. Thanks!
*  v0.455: (Trey#9048) Added hover description to item chat card traits. Thanks!
*  v0.454: (Trey#9048) Fixed an issue with focus spell heightening.
*  v0.452: (@ohporter) Fixed dice roll dialogs rolling when cancelled. Thanks!
*  v0.452: hotfix for hotbar items
*  v0.451: (Trey#9048) Added a new feature: Spell Heightening which adds a damage formula to spell damage per heightened level. 
*  v0.451: (Trey#9048) Enabled the drag and drop of actor items onto the FVTT hotbar.
*  v0.451: (Trey#9048) Fixed form input fields not being saved correctly when changing from one input field to another. 
*  v0.450: (Trey#9048) Further fixes initiative, adds Class Features as a feat type.
*  v0.449: (Trey#9048) Fixed actor initiative fix. Thanks!!!
*  v0.448: Fixed lore skill mod calculation for characters.
*  v0.447: Fixed issues with orphaned spell migration and incorporated chat damage buttons as a core feature.
*  v0.445: Added support for FVTT v0.4.5. 
*  v0.442: Added support for FVTT v0.4.2. and added spellcasting entry of type Scroll to allow scrolls to be stored in the spellcasting tab if you wish.
*  v0.441: Added support for FVTT v0.4.0. Please note this is the minimum support needed to get it working. A lot more work is required to bring the pf2e system in alignment with all changes.
*  v0.439: (fryguy#3851) Added support for Thieves Racket and fixed the dice used in the Deadly weapon trait.
*  v0.438: Fixed unhandled exception for spells that have an incorrect location set.
*  v0.437: Cleaned up spell SRD data for level 3 spells. Also added icons.
*  v0.436: (FS#5443) Added condition links to all SRD spell entries. Thanks!!
*  v0.435: Cleaned up spell SRD data for level 2 spells. Also added icons.
*  v0.434: Cleaned up spell SRD data for Cantrips and level 2 spells. Also added icons.
*  v0.434: Added requirements attribute to spells.
*  v0.434: Added support for rituals in Spell Browser.
*  v0.433: (fryguy#3851) Added indicator to weapons with two-hand trait to show if they are weilded in one or two hands. Thanks!!
*  v0.432: Fixed bug rolling attack and damage rolls on weapon chat cards post 0.3.9
*  v0.432: Added critical rolls to weapon chat cards
*  v0.432: Fixed bug with prepared spells after multiple spellcasting entries were added
*  v0.432: Fixed bug when editing NPC spell DC/attack post 0.3.9
*  v0.432: Fixed NPC attacks with compendium items
*  v0.431: Added support for FVTT v0.3.9.
*  v0.422: Overhauled the Item Browser logic and introduced new feature: Inventory Browser.
*  v0.421: Added Consumables and Adventuring Gear SRD compendium packs. Thanks Overdox#9174!!
*  v0.419: Fixed bug with form data validation for spell slot inputs on multiple spellcasting entries
*  v0.418: Added support for Property Runes on weapons (damage and crit).
*  v0.417: Added support for Two-Hand weapon trait and the ability to toggle between one-hand and two.
*  v0.416: (fryguy#3851) Fixed weapon compendium pack to align with new traits convetion. Thanks!!
*  v0.415: Added "Critical" button to item summary
*  v0.415: Added support for Fatal and Deadly weapon traits when rolling critical damage
*  v0.414: Fixed issue with NPC spell drag/drop
*  v0.413: Added a "+ Ability Mod" checkbox when editing spell damage details which applies the appropriate ability modifier to damage for the spellcasting entry.
*  v0.413: Fixed Sorcerer feats not being shown in the Feat Browser
*  v0.413: Added search icon on feat tab that opens the Feat Browser directly.
*  v0.412: Tidied up UI for spellcasting entries of type Ritual (more to come here)
*  v0.411: Spellcasting Entries Feature - Added support for multiple spellcasing entries
*  v0.411: Spellcasting Entries Feature - Proficiency rank, item bonus and ability are saved per entry
*  v0.411: Spellcasting Entries Feature - NPCs can now have prepared type spell entries
*  v0.411: Spellcasting Entries Feature - Output skill proficiency of player when rolling a skill check
*  v0.353: (FS#5443) Fixed bug with manual /roll 1d20 rolls not working. Thanks!!
*  v0.353: (FS#5443) Also fixed as issue with ad-hoc traits not rendering correctly. Thanks again! :)
*  v0.353: Updated the display of traits in the item summary to only be styled if they have additional description information to show (UX behaviour)
*  v0.353: (fryguy#3851) for fixing an issue with prepared spells not being removed correctly. Thanks!!
*  v0.352: Fixed bug with NPCs trying to calculate hero point icons and failing 
*  v0.351: Added Hero Points to character sheets
*  v0.350: Added chat button to allow setting initiative for selected tokens.
*  v0.349: Fix for NPC psuedo-lore skill rolls. Thanks FS#5443!
*  v0.349: Added ability to give NPCs weapons of a player characters type. This allows NPCs to use a special magic weapon that a PC can then pick up.
*  v0.349: Fixed traits for NPC attacks
*  v0.349: Fixed negligible bulk items not being an available option for consumables, backpack or equipment.
*  v0.348: Fixed spell tags to accurately display details about the spell
*  v0.348: Added the ability to modify the area of a spell
*  v0.348: Added the font Pathfinder2eActions.ttf (thanks u/baughberick (https://www.reddit.com/user/baughberick/))
*  v0.346: Added Weapons SRD compendium pack (Thanks Overdox!)
*  v0.346: Added additional console messages when loading compendium packs into the Compendium Browser for observability
*  v0.346: Fixed setting menu for the Compendium Browser so it modifies both feat and spell settings
*  v0.345: Added trait descriptions to all traits that display when hovered over a trait in item summaries
*  v0.345: Added color coding to tags to represent if they have additional information or not
*  v0.345: Removed less configuration
*  v0.344: Fixed lore proficiencies so they can be cycled from the character sheet 
*  v0.344: Fixed lore name and item bonus so it can be edited from the character sheet; also removed the edit button. 
*  v0.344: Fixed issue with lore skill information not being saved on world restart. 
*  v0.344: Added Multi-Attack Penalty buttons to NPC sheet
*  v0.344: Added Item Summary for NPC attackts
*  v0.341: Added Deadly d6 and Jousting d6 weapon traits 
*  v0.340: Merged in fix for NPC skills from FS#5443 AND improvements for multi-attack penalties from fryguy#3851. Huge thanks to both of you!
*  v0.339: Added weapon traits for Two-Handed, Deadly, Fatal, Versitle and Thown die sizes, damage types and distances.
*  v0.338: Included Feat (SRD) and Armor (SRD) compendium packs 
*  v0.337: Added Feat Browser