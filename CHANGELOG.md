# Changelog

## Version 4.1.3

### Bugfixes
* (stwlam) Fix issue causing migration failures on very old actors


## Version 4.1.2

### Bugfixes
* (stwlam) Fix issue causing old speed data to prevent some PC sheets from opening

### Data Updates
* (Tikael) Fix several NPC save values that were stored as strings


## Version 4.1.1

### Bugfixes
* (stwlam) Fix extraction of predicated damage dice
* (stwlam) Fix localization of non-land speeds
* (Supe) Fix detection of highest level for spell collection

### Data Updates
* (stwlam) Restore iconics' prototype tokens
* (stwlam) Fix language known by Uthuls (bestiary 1)


## Version 4.1.0

### System Improvements
* (In3luki) Update Compendium Browser text search to utilize `MiniSearch`
* (sturteva) Add spiritsense to available creature sense types
* (stwlam) Add limited support for DamageDice REs in spells (reflected in Healing/Harming Hands feats)
* (stwlam) Add support for hearing through walls that don't block sound (thanks to dev8675309 for assistance!)
* (stwlam) Incorporate V10 tremorsense detection mode
* (stwlam) Add undetected condition to token HUD
* (stwlam) Lower enforced PC ability score cap to 1 while in manual-entry mode
* (Supe) Add structured form for editing FlatModifier rule elements

### Bugfixes
* (stwlam) Fix token mirroring when scale is locked
* (stwlam) Fix issue causing secret text in journal entry text pages to become visible to players

### Data Updates
* (InfamousSky) Add Glass Skin feat
* (InfamousSky) Add cauldron of flying
* (itamarcu) Fix Blaze effect
* (SpartanCPA) Add a rollable save to Dragon's Rage Breath
* (SpartanCPA) Audit Age of Ashes book 1
* (SpartanCPA) Audit Doblagub (Extinction Curse)
* (SpartanCPA) Fix name of Legacy of the Hammer background
* (stwlam) Add critical specialization to Ruffian class feature
* (stwlam) Fix description of Fatal Aim trait
* (stwlam) Fix predicate on Precise Strike's damage dice RE
* (Supe) Add Scroll Trickster bonus to trick magic item


## Version 4.0.6

### System Improvements
* (stwlam) Skip module nags for modules with no `esmodules` or `scripts`

### Bugfixes
* (In3luki) Fix Compendium Browser order-by values getting defaulted to name
* (In3luki) Fix display of class features in the class item sheet details tab
* (stwlam) Fix issue causing predicated new movement types to always be applied to a PC
* (stwlam) Fix damage roll notes getting dropped from chat cards
* (stwlam) Fix item-drop handling on kit sheets
* (stwlam) Fix issue preventing JSON imports from V9 actors

### Data Updates
* (LebombJames) Brushup witch features and feats
* (LebombJames) Correct "Feat/Feature" in Feat Sheet Header
* (Shandyan) Automate tiefling feats
* (Shandyan) Correct Crunch feat, Runelord Specialization and remove Form of the Fiend variants
* (SkepticRobot) Add missing Dark Archive backgrounds
* (Tikael) Fix Cover effect


## Version 4.0.5

### Bugfixes
* (In3luki) Fix metagame information being stripped from message flavor before the chat message is created
* (stwlam) Work around upstream issue affecting Foundry users upgrading from V9 to 10.285
* (stwlam) Fix issue causing inline rollable links to wrongly omit repost buttons
* (stwlam) Restore aura rechecking on embedded item changes

### Data Updates
* (LebombJames) Remove outdated critical text from Wounding rune


## Version 4.0.4

### System Improvements
* (stwlam) Hide damage buttons for not-damaging weapons (e.g., Tanglefoot Bag)
* (Supe) Have ChatMessage#item return the strike weapon if available (for module usage)

### Bugfixes
* (In3luki) Fix distribute coin popup
* (stwlam) Prevent context menu from appearing on right click in status effects menu for some OS/browser combinations
* (stwlam) Include journal entries in compendium search
* (stwlam) Fix issue causing post-to-chat button to not appear for @Check expressions in journal entry pages
* (stwlam) Migrate weapon and spell resolvables in rule elements for V10 compatibility
* (stwlam) Fix persistent damage icon path
* (stwlam) Fix multiple issues causing roll notes to display with superfluous line breaks
* (stwlam) Fix obscuring sender names on chat messages when feature is enabled
* (stwlam) Fix functionality of greater darkvision with no standard darkvision

### Data Updates
* (avagdu) Update Advanced Synergy to be takable multiple times
* (Dods) Add rule elements to Skill Mastery (Rogue archetype)
* (Friz) Brushup Doblagub
* (Friz) Fix rule elements on Terrified Retreat, Feverish Enzymes, and Hellknight Dedication feats
* (SpartanCPA) Add book source citations to more feats and effects missing them
* (stwlam) Restore Fledgling Flight feat
* (Tikael) Add missing Dread runes
* (Timingila) Updated Despair aura of Khisisi
* (Xdy) Fix All-Around Vision on several NPCs

## Version 4.0.3

### Bugfixes
* (stwlam) Fix darkness adjuster rendering on scene view
* (stwlam) Update in-Foundry changelog URL to point to V10 release branch

### Data Updates
* (SpartanCPA) Fill in (book) sources on items missing them
* (TMun) Correct perception and missing darkvision on spellskein


## Version 4.0.2

### Bugfixes
* (stwlam) Work around upstream issue causing erratic canvas-rendering behavior


## Version 4.0.1

### System Improvements
* (stwlam) Add support for item drops on familiar tokens
* (stwlam) Add a basic hearing detection mode
* (stwlam) Only show repost buttons on chat messages to message owners
* (stwlam) Consolidate shallow/deep search in compendium sidebar
* (stwlam) Change default order-by for most compendium browser tabs to level

### Bugfixes
* (GravenImageRD) Show the correct item name in parentheses when mystified
* (In3luki) Fix Compendium Browser pack selection not being saved
* (stwlam) Fix removal of basic unarmed attack causing strike-index mismatching
* (stwlam) Fix composite longbows/shortbows sometimes not being recognized as equivalent to standard longbows/shortbows
* (stwlam) Fix strike drops on hotbar
* (stwlam) Fix pair of rendering issues with darkness adjuster when viewed scene is changed
* (stwlam) Fix showing limited NPCs with `actorLink`s in actor directory
* (stwlam) Fix stack overflow sometimes triggered when closing token config
* (stwlam) Fix add/remove attack proficiencies on PC sheet
* (stwlam) Update Earn Income macro to function in V10
* (stwlam) Fix grid highlighting of measured templates
* (Supe) Fix ammo not getting consumed
* (Supe) Fix display of repeating ammo on PC sheet
* (Supe) Fix error sometimes thrown on NPCs with empty descriptions
* (Supe) Fix hazard attack and damage rolls

### Data Updates
* (GravenImageRD) Add missing traits to Peachwood Talisman
* (Kuroni) Fix source of Undead Scourge equipment
* (Shandyan) Automate tengu feats
* (SpartanCPA) Add references to Coerce and buttons to Intimidation Feats
* (stwlam) Add REs to handle Flying Blade feat
* (stwlam) Remove `applyMod` from two-action Harm spell variant
* (Tikael) Fix localization of Sprite strikes
* (Tikael) Add Dark Archive Web Supplement content

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
