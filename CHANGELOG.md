# Changelog

## Version 4.0.0 (Beta 3)

### System Improvements
* (LebombJames) Clear search bar in compendium browser when filters are cleared

### Bugfixes
* (stwlam) Restore damage types to spell sheet
* (stwlam) Fix race condition causing kits to inflate with incorrect item quantities
* (stwlam) Fix issue causing advanced alchemy formulas to not be removable
* (stwlam) Fix compendium browser pre-filter for ancestry feats on PC sheet
* (stwlam) Disable vision options in prototype token config if RBV is enabled
* (Supe) Fix removing Elite/Weak adjustments

## Version 4.0.0 (Beta 2)

### Bugfixes
* (stwlam) Fix issue causing auras to not appear until after their source is removed
* (stwlam) Fix issue causing some AE-like rule elements to not apply
* (stwlam, Supe) Fix vision and detection modes not functioning when rules-based vision is disabled
* (Supe) Fix display and deprecation warnings in vehicle biography tab
* (Supe) Fix display of scrollbars in hazard sheet
* (Supe) Fix UI error thrown when editing hazard traits

### Data Updates
* (Dooplan) Fix level of Icewyrm
* (Shandyan) Automate strix feats


## Version 4.0.0 (Beta 1)

### New Features
* (Supe) Add "view art" button to NPC sheet for easier sharing with players
* (Supe) Render temp hp above health bar

### System Improvements
* (In3luki, stwlam, Supe) Support Foundry V10
* (LebombJames) Set compendium search box to input type "search"
* (stwlam) Move management of system user settings to user config
* (stwlam) Change default condition icons to full-color, remove legacy option
* (Supe) Retire legacy hazard sheet
* (Supe) Use tagify for editing NPC, hazard, and item traits
* (Supe) Hide sidebar on rules tab of item sheets
* (Supe) Add selector list support to FlatModifier rules element
* (Supe) Fade out combatant names in encounter if mystified
* (Supe) Improve visibility of spell preparation button for preparared casters
* (Supe) Add weapon-sheet-style material selection to armor
* (Supe) Implement Brutal trait for PCs
* (Supe) Remove "system style" journal sheet
* (Supe, Mats) Update character proficiency tab to new headers
* (Supe) Have compendium sidebar content search also match compendium names
* (Supe) Organize item types in new item dialog into groups

### Bugfixes
* (Cheps) Fix the timefilter select behavior in the spell compendium browser
* (Eddie) Allow ability score boosts at level 0
* (stwlam) Suppress fundamental runes on armor if ABP is enabled
* (stwlam) Calculate aura coverage in three dimensions
* (stwlam) Fix application of dexterity modifier cap when AC is zero

### Data Updates
* (Abaddon) Review Bestiary 3: harmona, hellwasp swarm, herexen, house drake, storm hag
* (Abaddon) Standardize capitalization of hyphenated creatures in Bestiary 3
* (avagdu) Fix localization of REs on Draconic and Wyrmblessed Bloodlines
* (avagdu) Remove Nudge Fate spell effect
* (Brandon Maier) Fix spelling of Infectious Melody, Weapon of Judgment, and Construct Mindscape spells
* (kageru) Fix several roll expressions and remove unused translation key
* (Kuroni) Fix Clockwork Macuahuitl description
* (Kuroni) Remove several errant line breaks and other formatting from item descriptions
* (rectulo) Fix feat type of Space-Time Shift
* (Shandyan) Automate suli, sylph, and undine feats
* (Shandyan) Convert Deep Backgrounds to new journal format, move Deck of Many Things text to roll tables
* (SpartanCPA) Add a link to Detect Magic in the Arcane Sense feat
* (SpartanCPA) Add inline rollable buttons for Perception, Saving Throws, Scare to Death, Disable a Device checks
* (SpartanCPA) Correct roll note for Jiang-Shi Minister of Tumult
* (SpartanCPA) Make Flat Checks rollable across packs
* (SpartanCPA) Make Thievery Checks on Handcuffs and Manacles rollable
* (SpartanCPA) Make rollable buttons across packs for remaining Skills
* (SpartanCPA) Make rollable buttons for Athletics checks
* (SpartanCPA) Make skill buttons rollable for Crafting, Perception, and Arcana
* (SpartanCPA) Move Aid and Aquatic Combat effects to Other Effects
* (SpartanCPA) Set magical tradition of NPC Change Shapes
* (SpartanCPA) Add sources to NPCs from SoT Book 4
* (stwlam) Fix category of two drake rifle variants
* (stwlam, Tikael) Retire two effects compendiums and consolidate their contents
  * "Consumable Effects" removed, contents moved to "Equipment Effects"
  * "Feature Effects" removed, contents moved to "Feat/Feature Effects"
  * "Exploration Effects" renamed to "Other Effects"
* (stwlam) Exclude invalid options (philosophies) from cleric/champion deity choices
* (stwlam) Have Hand of the Apprentice feat enlarge focus pool
* (stwlam) Fix melee/ranged status of chakrams
* (stwlam) Add spell effect for Wash Your Luck
* (stwlam) Fill out REs for dogtooth tengu
* (stwlam) Fix duration of Veil of Dreams spell effect
* (ThunderousLeft) Add no-crowbar-penalty suppression rule elements
* (Tikael) Fix description of Iris of the Sky item
* (Tikael) Convert inline links in localizations to reference UUID
* (Tikael) Clean up Oracle automation
* (Tikael) Remove old spell effects that have been consolidated
* (Tikael) Add Reborn Soul background
* (Tikael) Add Slowed condition to all zombies missing it
* (Tikael) Add automation to the Magical Experiment background.
* (Tikael) Add duration to Air Bubble spell
* (Tikael) Add localization for persistent force damage
* (Tikael) Add missing creature family abilities
* (Tikael) Add missing equipment from Knights of Lastwall
* (Tikael) Add missing passives to Vetalarana Manipulator
* (Tikael) Automate Sniper's Aim feat and Tripods
* (Tikael) Begin consolidating journals, add GM screen.
* (Tikael) Change Caterwaul Sling icon to Sling
* (Tikael) Change usage of religious symbols to held in one hand
* (Tikael) Fix Evangelize prerequisites
* (Tikael) Fix bonuses and penalties that should only apply to land speed
* (Tikael) Fix damage roll of Control Weather Spellskein
* (Tikael) Fix details of Intensify Vulnerability feature
* (Tikael) Fix feat type of Corpse Tender archetype feats
* (Tikael) Fix inline damage on Violent Unleash feat
* (Tikael) Fix inline roll in Ochre Fulcrum Lens
* (Tikael) Fix level of Thomil Bolyrius
* (Tikael) Fix alignment of Spirit Naga
* (Tikael) Fix traits of Confident Finisher and Jafaki's strike
* (TMun) Add Lost Omens: Travel Guide
* (TMun) Add NPCs from Bounty 20
