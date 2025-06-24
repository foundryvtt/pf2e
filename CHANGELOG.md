## 7.2.1

### Bugfixes

- (stwlam) Fix errors when migrating from some old versions
- (Supe) Fix action glyphs and inline gm text in prosemirror menus
- (Supe) Fix create kingdom button duplicating in certain conditions
- (Supe) Fix duplicate buttons in user config
- (Supe) Fix excessive space between elements in chat messages
- (Supe) Fix issue where item description alterations may sometimes be unformatted
- (Supe) Fix migrating compendiums in the migration status window
- (Supe) Prioritize selected token when calculating ranged increment

### Data Updates

- (Ambrose, Tikael) Add content from Myth-Speaker's Player's guide
- (Ambrose) Add Ancient Stone strike and correct action cost of Echo the Past on Lithic Locus npc
- (Ambrose) Add Ankou Shadow Double actor and link to Ankou's Shadow Double ability
- (Ambrose) Add area damage, area-effect and damaging-effect options to more NPC abilities
- (Ambrose) Add Escape act prompt to select NPC abilities
- (Ambrose) Add Temperature Effects to the GM Screen journal
- (Ambrose) Add automation to Fortune's Coin items
- (Ambrose) Add effect for Gladiator Dedication and Play to the Crowd
- (Ambrose) Add escape actions to select NPC abilities
- (Ambrose) Add icons to select Deities
- (Ambrose) Add missing Tallusian actor to Claws of the Tyrant bestiary
- (Ambrose) Brush up Fiery Body spell effect and redirect 9th Rank version
- (Ambrose) Correct spelling of khakkhara in Noble Branch class feature
- (Ambrose) Default Brass Dwarf's initial resistance selection to fire
- (Ambrose) Improve automation of several Spellshape feats and Codex of Destruction and Renewal
- (Ambrose) Refresh Seelah's Iconic actor
- (Ambrose) Remove Manticore Bestiary actor and redirect to Monster Core equivalent
- (Ambrose) Update Azarketi Crab Catcher and Azarketi Tide Tamer's strikes
- (Dire Weasel) Add area-effect to Picture-in-Clouds' Elephant Blast
- (Dire Weasel) Add effect for Subaquatic Marauder's Depth Charge
- (Dire Weasel) Brush up effect for Barbed Net
- (Dire Weasel) Fix action cost of some instances of Frightful Moan
- (Dire Weasel) Fix some basic saves
- (Dire Weasel) Fix some missing spell IDs
- (Dire Weasel) Remove fey trait from Mandragora's Blood Scent and Blood Drain abilities
- (DocSchlock) Add AdjustModifier to Powerful Alchemy for DC replacement
- (DocSchlock) Add Language AELike REs to Chokers of Elocution
- (DocSchlock) Update Wellspring Surge roll table with inlines and conditions
- (kromko) Add missing traits to Wand of Shattering Images and Wand of Shocking Haze
- (kromko) Add slug to Barghest's Unhealing Wound
- (kromko) Fix multiple localization keys
- (Rigo) Add effects for Called Shot and Targeting Finisher
- (Rigo) Add effects for Electromuscular Stimulator
- (Rigo) Add spellwatch to armor property runes list
- (Rigo) Adjust DC of invested items with Intensify Investiture
- (Rigo) Allow other Strikes to be made with Stonestrike Stance
- (Rigo) Automate Greenwatcher's cold iron Strikes and critical hit Note
- (Rigo) Automate Swashbuckler's Incredible Luck
- (Rigo) Correct action cost of some Exemplar transcendence actions
- (Rigo) Ensure Compliant Gold's Item Alteration adds reach to chosen ikon
- (Rigo) Grant quickened condition with Panache Paragon and add Will save to Vivacious Afterimage
- (Rigo) Implement Major Bestial Mutagen's Weapon Specialization
- (Rigo) Update text of Greater than the Sum to Player Core 2
- (Tikael) Add effect for Triceratops' Frill Defense

### Under the Hood

- (In3luki) Exclude flat checks from adjusting inline-dc

## 7.2.0

### System Improvements

- (DocSchlock) Hide Token Name based on metagame settings when transferring items
- (DocSchlock) Change Disarm, Trip, Grapple, and Shove to use best equipped weapon bonus
- (Supe) Add expend field to weapons

### Bugfixes

- (In3luki, stwlam, Supe) Fix token size and size linking for V13. Update your actors to see changes.
- (DocSchlock) Fix Earn Income Macro always trying to use Armor Check Penalty
- (In3luki) Fix creating RollTable`s from the compendium browser
- (In3luki) Fix EffectsPanel tooltip for Foundry 13.345
- (In3luki) Fix error when executing the repair action
- (In3luki) Fix error with initializing ephemeral effect rule elements
- (In3luki) Fix Prototype Token Config for Foundry V13
- (In3luki) Fix WorldClock not showing anything for players
- (jfn4th) Don't set Dark Mode colors on windows with theme-light override
- (jfn4th) Fix show/hide of Roll Options in Generate Check Prompt
- (Supe) Avoid prosemirror menu wrapping in item and hazard sheets

### Data Updates

- (Ambrose) Add area damage and damaging effect indicators to more NPC abilities
- (Ambrose) Add automation and update descriptions for multiple Wrestler archetype feats
- (Ambrose) Add automation to Ursine Avenger's Great Bear feat
- (Ambrose) Add distance calculation and damage roll to Whirling Throw
- (Ambrose) Add effect to Wyrm Spindle Spellheart
- (Ambrose) Add note for Werebat's Curse of the Werebat
- (Ambrose) Update Helt's Spelldance action cost
- (Ambrose) Update Change Shape automation for multiple werecreatures
- (Ambrose) Update text on Strangle to match Player Core 2 and add automation
- (DocSchlock) Add Covenant support to Clerics and Champions
- (DocSchlock) Add REs to Walking Cauldron to reduce bulk when animated
- (DocSchlock) Add Shattering Earth's Critical Note
- (DocSchlock) Add support for Instinct Ability to Fury Instinct
- (DocSchlock) Remove unneeded flat check from Wild Hunt Archer
- (Ikaguia) Automate Bellflower Tiller's Scarecrow
- (kromko) Fix Change domain text, update and sort deities
- (kromko) Fix Greater Advancing rune effect, TV wands rank, Anylength Rope description
- (kromko) Fix Major Enigma Mirror spell DC, fix TV item descriptions
- (kromko) Update Hexing Jar RE with remastered patrons
- (micatron) Modify Linguist Dedication Society upgrade RE if already trained
- (Rigo) Add alchemical and aura shield traits to Magnetic Shield
- (Rigo) Add Bracers of Devotion effect
- (Rigo) Add Clan Dagger Filigrees from LO:SK as property runes
- (Rigo) Add journal link to Wylderheart Dedication and fix Forest of Gates formatting
- (Rigo) Fix autoresolving Choice Sets in ammunition effects when dragged from damage notes
- (Rigo) Grant persistent damage with Ooze Ammunition depending on its variety
- (Rigo) Set Wooden Rage's toggle to false if disabled
- (Rigo) Support weapon damage Arcane Cascade selection with Student of the Staff
- (Rigo) Update formatting and automation on Shining Kingdom feats
- (Rigo) Update source and publication on remastered Treasure Vault items and effects
- (SpartanCPA) Add REs to Coil for Giant Viper
- (SpartanCPA) Add Weakness RE to Curse of Potent Poison
- (TactiCool) Adding the missing trigger description to the "drop dead" spell.
- (Tikael) Add missing variant NPCs for TotT and SoG
- (Tikael) Fix the size of Unrisen Slithermaw
- (Tikael) Refresh several copies of Blessed Boundary

### Under The Hood

- (In3luki) Enable AdjustModifier predication on derived values and pass more roll options to inline checks

## 7.1.1

### Bug Fixes

- (In3luki) Avoid performance issues with Effects Panel
- (oWave) Fix token hearing filter effect
- (Trent) Include roll options for check previews, fixing certain incorrect calculations

### Data Updates

- (Ambrose, MechaMaya, Rigo, Tikael) Add content from LO Shining Kingdoms and Treasure Vault remaster

## 7.1.0

Add support for Foundry V13
