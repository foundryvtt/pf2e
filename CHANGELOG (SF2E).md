## 1.0.3

### Bugfixes

- (stwlam) Fix field name in appearance tab of `TokenConfig`
- (stwlam) Fix show damage dialog toggle
- (stwlam) Restore overlay icon on tokens of dead actors
- (stwlam) Restore status effects title bar
- (Supe) Fix colors of whisper and blind inline rolls in dark mode
- (Supe) Fix empty tooltips flashing when hovering over the effect panel
- (Supe) Fix items and actions sent by players defaulting to blind
- (Supe) Fix styling of character language tags

### Data Updates

- (Ambrose) Add an index to the Ancestry Journals and link to GM and Player screens
- (Ambrose) Add Osharu language to the Osharu ancestry
- (Ambrose) Correct weapon group for Orocoran's Projective Vomit Ancestral Unarmed Attack
- (kromko) Fix spell link in Mutant Goblin's Mutant Magic
- (Longstrider) Correct GA ancestries' descriptions

## 1.0.2

### System Improvements

- (7H3LaughingMan) Allow modification of roll-twice behavior in damage-roll hooks
- (stwlam) Convert Check Prompt Generator to `ApplicationV2`, add raw output preview
- (Supe) Convert Attack Proficiencies dialog to `DialogV2`

### Bugfixes

- (In3luki) Fix Compendium Browser header controls
- (In3luki) Fix updating physical-item prices
- (In3luki) Fix `TextEditorPF2e#_createInlineRoll` failing to return pre-rolled inline rolls
- (stwlam) Fix double-barrel icon on PC sheet
- (stwlam) Fix handling of damage changes in NPC Attack sheet
- (stwlam) Fix localization of damage-application chat message
- (stwlam) Have hearing detection test against region surfaces
- (stwlam) Restore token effect icons

### Data Updates

- (Ambrose) Add description and spell effect to Monstrosity form
- (Ambrose) Move Recharge Weapon to the Cantrips folder
- (Ambrose) Remove Quick Coercion's self-grant RE
- (kromko) Add missing Galactic Ancestries localization strings
- (Longstrider) Fix Golarion ancestries' descriptions
- (Longstrider) Brush up SF2e versatile heritages
- (Longstrider) Correct Cryopike's weapon group
- (Rigo) Fix path to cover-reduction flag in Aim's ephemeral effect

## 1.0.1

### Bugfixes

- (In3luki) Fix detection of inline damage rolls
- (In3luki) Fix Region shape resetting after release of shape control handles
- (In3luki, stwlam) Fix localization of check-roll message flavor
- (stwlam) Fix style incapability with V14 code-mirror elements in Note Rule Element form
- (stwlam) Fix issue preventing changing viewed scene
- (stwlam) Restore styling of inline roll links according to roll (now message) mode

### Data Updates

- (Ambrose) Add missing traits to Android ancestry
- (Ambrose) Correct Fonqugon's land speed
- (iDantar) Condense bless aura and spell effects

## 1.0.0

### Bugfixes

- (stwlam, Supe, In3luki) Update to support V14

### Data Updates

- (Ambrose) Add missing spellscasting entry and abilities to Hesper
- (kromko) Fix Paragon Maratan Headache's level

## 0.0.11

### Bugfixes

- (stwlam) Fix errors with token document flags during data preparation

### Data Updates

- (Ambrose) Correct Insect Form's Mantis damage type
- (kromko) Fix Loosen Skin trigger
- (kromko) Fix Rubberlimb Orocoran heritage name
- (kromko) Fix Tactical Medkit Treat Wounds predicate

## 0.0.10

### Bugfixes

- (stwlam) Fix issue causing stack overflow during some token data preparation

## 0.0.9

### System Improvements

- (stwlam) Add option to NPC Attack items to exempt them from MAP

### Bugfixes

- (stwlam) Fix refreshing scene controls when "Show World Clock" setting is changed
- (Tikael) Add `item:trait` roll options to action macros

### Data Updates

- (Ambrose, Mecha Maya, Tikael) Add content from Galactic Ancestries
- (Ambrose) Add missing deities and philosophies
- (Ambrose) Add Necromancer's Apprentice Background to Duplicates.json and update Armored Coat's id to match PF2e
- (Ambrose) Add Notes to Scare to Death
- (Ambrose) Expand GM Screen Chase subsystem journal entry
- (Ambrose) Update slug for Sharp-Toothed Vlaka's Jaw attack
- (kromko) Add Armor base sf2e localization overrides
- (kromko) Add description and built-in upgrades to Shobhad Longrifle
- (kromko) Add journal links to ancestries, classes and dedications
- (kromko) Add REs to Emotionless and Widen Spell to match PF2e, add missing terrain to Terrain Expertise
- (kromko) Fix AbadarCorp Rep archetype capitalization
- (kromko) Fix Cosmic Dragon Adult Spellcaster's Stellar Breath inline check
- (kromko) Fix publication for Emissary, heightening for Summon Instrument, and minor typos
- (kromko) Fix Space Pirate archetype journal entry intro
- (kromko) Remove `strong` tags around trait lists in Heal/Harm and consumable activations
- (Longstrider) Add spell effect for Eldritch Bond
- (Longstrider) Fix Hefty 2 trait description
- (Longstrider) Fix the Aeon Guard and Veskarium Paratrooper
- (Maksim) Add deployment toggle to Ultralight Wings
- (Tikael) Add missing language to Vlaka

### Under the Hood

- (stwlam) Avoid eager construction of all synthetic actors during world load
- (stwlam) Remove system `JournalSheet` subclass

## 0.0.8

### Bugfixes

- (iDantar) Fix embedded shields not being alterable by rule elements
- (Justin Hayes) Fix a bug preventing players from trading
- (Supe) Also resolve persistent damage for troop segments and familiars
- (Supe) Also sync troop tokens on token creation and deletion
- (Supe) Fix roll options and selectors passed to inline escape checks

### Data Updates

- (Ambrose) Add missing Animal Form spell and missing forms
- (Ambrose) Add missing Emotionless Android level 1 ancestry feat
- (Ambrose) Update Retractable trait description to match SF Player Core text
- (kromko) Add missing Dispelling Globe, deduplicate Disappearance, restore `compendiumSource` to actor-embedded spells and refresh them from compendium
- (kromko) Add missing localization strings to SF2e
- (kromko) Add rituals from Alien Core
- (kromko) Fix `@Check` typos for skills and lores
- (kromko) Refresh Sihedron Guard Thunderstriker's spell gem
- (kromko) Remove duplicate Gambler background
- (Longstrider) Implement Alien Core creature improvements (A-E)
- (Tikael) Brush up Guilt of the Grave World NPCs and backgrounds
- (Tikael) Fix loading of Replica Zo Microphones

## 0.0.7

### Bugfixes

- (Supe) Fixed pinging and delete confirmations for non-troop combatants
- (Supe) Remove throttle for troop thresholds

### Data Updates

- (Ambrose) Remove heightened 4th rank Enlarge spell effect
- (eltariel) Update saving throw predicate for Cloned Astrazoan to use "or"
- (Mecha Maya) Add missing languages from Alien Core

## 0.0.6

### Bugfixes

- (Supe) Fix troop tokens with custom scaling such as from art modules

### Data Updates

- (Cuingamehtar) Fix Host Dragons' Frighful Presence DC
- (Longstrider) Implement minor creature fixes and "grappled" blanket fix
- (Tikael) Add icons for remaining SF ancestries and versatile heritages

## 0.0.5

### System Improvements

- (Alex Clark) Add support for weapon capacity item alterations
- (Mecha Maya) Add Starfinder Pact Standard (AG) to world clock options
- (Supe) Add system implementation for troops
- (Supe) Allow saves with a modifier of 0 in hazards
- (Surge) Add SF2e locale overrides for Home World and Port of Call
- (Surge) Update SF2e PFS tab for SFS2

### Bugfixes

- (In3luki) Fix missing DC value in some check context flags
- (In3luki) Fix mutation from `system.time.value` reference in spell filter
- (kromko) Fix aura-blind areas appearing when aura touches a wall
- (Rigo) Fix Take Cover action in SF2e
- (stwlam) Set condition pack ID according to system in `ConditionManager`
- (Supe) Propagate magical trait for magical weapon upgrades
- (Surge) Fix avert gaze and NPC Raise a Shield
- (Surge) Fix GM Vision toggle button for SF2e
- (Tikael) Fix logic in DamageAlteration dice face upgrades/downgrades
- (Tikael) Fix player looting in SF2e

### Data Updates

- (Ambrose) Add Besmara
- (Ambrose) Add Dragon Form to SF2e proper and remove it from the Duplicates list
- (Ambrose) Add miscellaneous missing effects to SF2e
- (Ambrose) Add SF2e GM screen
- (Ambrose) Correct bonus value for Religious Talisman
- (Ambrose) Delete and redirect duplicate Guilt of the Grave World actors
- (Ambrose) Update Murder in Metal City classes, feats, ancestries, ancestry features, heritages and backgrounds.
- (Ashgar225) Fix Status Effect Duplication
- (CotillionTheRope) Add missing backgrounds of Gambler, Detective, Emissary, Prisoner, and Raised by Belief
- (Dire Weasel) Add deadly d4 and d6 traits
- (Dire Weasel) Update description of Shadow Blast and remove spell overlays
- (kromko) Add Sense Direction SF2e localization override
- (kromko) Fix Danger Awareness link in archetype journal
- (kromko) Fix Recall Knowledge links
- (kromko) Link Avert Gaze effect to its action
- (kromko) Remove the mention of aiuvarin heritage in SF2e Multitalented feat
- (kromko) Straighten single quotes and fix minor whitespace issues
- (kromko) Update data of some actors from NPC Core
- (Longstrider) Add Analyze Environment exploration activity
- (Longstrider) Add missing skill feats to SF2e
- (Longstrider) Add Resilient trait description
- (Longstrider) Brush up Nodocite Incarcerator's Catchapon
- (Longstrider) Change SF2e Summon Celestial spell to a unique entry
- (Longstrider) Polish GM Screen journal
- (Longstrider) Update Specialty Crafting feat and delete incorrect condition links
- (Mecha Maya) Fix Sensory Diversity feature description formatting.
- (Rigo) Add Spiritual Armament to Starfinder duplicates list
- (SpartanCPA) Correct description for New Game
- (SpartanCPA) Correct size of the Spellcaster Host Dragons
- (SpartanCPA) Remove duplicated SFS actor
- (steve148) Add suspended respiration ancestry feature to Sarcecian ancestry
- (steve148) Fix Walking Armory penalties
- (steve148) Update description for cosmic and tech traits
- (steve148) Update Ysoki starting languages list
- (steve148) Use credits instead of gp in spell cost
- (Surge) Add SFS2 purchasable boons
- (Surge) Use token assets for all SF2e iconic prototype tokens
- (Tikael) Add Consecrated Keycaps from MiMC
- (Tikael) Add content from SFS 1-15 and 1-16
- (Tikael) Add missing NPC only Boost trait
- (Tikael) Change all system flag references to `flags.system`
- (Tikael) Duplicate Blazing Bolt and Harm from the PF2e spells
- (Tikael) Fix several issues in SFS actors

## 0.0.4

### Bugfixes

- (Supe) Fix updates to nested ammo wiping the ammo type
- (Supe) Support apex items that don't require investment
- (Supe) Adjust bulk resizing such that smaller items on larger actors are 1/2 instead of 1/10.
- (Supe) Fix effects panel image paths with parenthesis not showing
- (Tikael) Fix scaling item price by size in SF2e

### Data Updates

- (Ambrose) Correct typo in Solar Shield effect's rule elements
- (Ambrose) Remove Rare tag from Elebrian
- (Ambrose) Update feats and class features in SF2e Iconics
- (Ambrose) Add Android Level 5 feats and select duplicate backgrounds to duplicates list
- (CotillionTheRope) Add missing Ysoki ancestry feats
- (Longstrider) Add missing human feats
- (kromko) Add tech trait to consumables and refresh physical items and spells for all SF2e actors
- (kromko) Rename and merge Double Draw
- (Infamous Sky) Brush up MiMC actors
- (Mecha Maya) Add missing monster strike traits from Alien Core
- (Mecha Maya) Add effects for Enhance Weapon and Enhance Body
- (Shazburg) Fix level and traits of Big Mouth
- (Sphess Marine) Fix crafting crit success daily reduction
- (Simon Ward) Tidy description for Spell Effect: Glow Up
- (Tikael) Fix loading of Blockthrower and Reality Ripper
- (Tikael) Automate heightened Protection effect

## 0.0.3

- (jfn4th) Fix attribute builder not opening in SF2e

## 0.0.2

### System Improvements

- (Mecha Maya, Supe) Add support for modular and add config to SF2e weapons
- (jfn4th) Update attribute builder to appv2
- (stwlam) Add system banner
- (Supe) Add piloting actions for /act syntax

### Bugfixes

- (Supe) Fixed an issue preventing players from buying items from merchants

### Data Updates

- (Ambrose) Add missing Android and Ysoki Lore Feats
- (Ambrose) Add missing Fire Wisp and Converted Yearling Arabuk actors
- (Ambrose) Fix some incorrect item prices
- (Supe) Update ids of medkits, repair toolkits, and holoskins to match pf2e equivalents
