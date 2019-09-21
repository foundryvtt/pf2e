# Pathfinder Second Edition System

This system adds support for Pathfinder Second Edition to Foundry VTT.

### PF2e Version
This is the initial alpha release of the Pathfinder Second Edition system.

Patch Notes:
v0.346:
*  Added additional console messages when loading compendium packs into the Compendium Browser for observability
*  Fixed setting menu for the Compendium Browser so it modifies both feat and spell settings


v0.345:
*  Added trait descriptions to all traits that display when hovered over a trait in item summaries
*  Added color coding to tags to represent if they have additional information or not
*  Removed less configuration

v0.344: 
* Fixed lore proficiencies so they can be cycled from the character sheet 
* Fixed lore name and item bonus so it can be edited from the character sheet; also removed the edit button. 
* Fixed issue with lore skill information not being saved on world restart. 
* Added Multi-Attack Penalty buttons to NPC sheet
* Added Item Summary for NPC attackts

v0.341:
* Added Deadly d6 and Jousting d6 weapon traits 

v0.340:
* v0.340: Merged in fix for NPC skills from FS#5443 AND improvements for multi-attack penalties from fryguy#3851. Huge thanks to both of you!

Prior patches:
* v0.339: Added weapon traits for Two-Handed, Deadly, Fatal, Versitle and Thown die sizes, damage types and distances.
* v0.338: Included Feat (SRD) and Armor (SRD) compendium packs 
* v0.337: Added Feat Browser

Please Note:
- Functionality is not complete with plenty of work remaining. 
- This is a fork of the dnd5e system so there may still be references to dnd5e in places and the assets from 5e are included for now (I plan to use them soon).
- If you find any issues or have any feedback please let me know.

Known Issues (see project issues for full issues list):
- AC is not automatically calculated, Just enter it in the input field.
- Critical damage is not calculated currently.

### FVTT Version:
- Tested with FVTT v0.3.6.

### Installation Instructions

To install the system, follow these instructions:

1. Start FVTT and browse to the Game Systems tab in the Configuration and Setup menu
2. Select the Install System button and enter the following URL: https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/raw/master/system.json
3. Click Install and wait for installation to complete
4. Create a new world using the PF2e system.

### Shoutouts

A huge thanks to:
- FS#5443 for the addition of multi-attack buttons!
- Overdox#9174 for contributing hugely to the SRD compendium packs!
- @fyjham-ts https://github.com/fyjham-ts/Pathfinder-2E-Spell-DB for the raw data I used (and FS#5443 for pointing me to it).
- Felix#6196 for the creation of Spell Browser (https://github.com/syl3r86/Spell-Browser) and kind permission to allow me to incorporate it into this system.
- fryguy#3851 for contributing to the project with improvements to the NPC sheet!
- Moo Man#7518  and CatoThe1stElder#9725 for the wfrp4e system which I used for inspiration on my inventory onDrop method.

### Feedback

If you have any suggestions or feedback, please contact me on discord (hooking#0492)