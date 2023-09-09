## 5.4.4

### System Improvements

-   (Supe) Improve clarity of overland travel labeling on party sheet

### Bugfixes

-   (SkepticRobot) Fix non limited npcs showing in actors tab
-   (stwlam) Fix compendium browser rarity-tag coloration
-   (stwlam) Fix party name input being editable to non-owners of party actor
-   (stwlam) Fix width constraint of lootable NPC sheet sidebar

### Data Updates

-   (Dire Weasel) Brush up automation and add inline checks to several NPCs
-   (Dire Weasel) Add effect for Rousing Splash
-   (stwlam) Add remaining armor property runes from Treasure Vault

## 5.4.3

### System Improvements

-   (stwlam) Add UI enhancements to party stash tab: coin values, rarity coloration of item names, stash total bulk
-   (stwlam) Animate party clown car loading/unloading and incorporate wall detection when depositing tokens

### Bugfixes

-   (reyzor1991) Include roll options passed to strike methods when rolling
-   (stwlam) Make damage from ability items responsive to magical immunities, resistances, and weaknesses
-   (stwlam) Restore legacy boost row in attribute builder
-   (stwlam) Fix display of attack modifier on familiar sheet

### Data Updates

-   (Abaddon) Remove scroll case and sheath from NPCs
-   (Dire Weasel) Add automation for Gallowdead's Charge Chain, Groplit's Flammable Grease, and Umbral Dragon's Ghost Bane
-   (Dire Weasel) Add Capritellix from _Rage of Elements_
-   (Dire Weasel) Add effects for Grindlegrub Steak, Incendiary Dollop, Irondust Stew, Therapeutic Snap Peas
-   (Dire Weasel) Add inline checks to several NPC abilities
-   (Dire Weasel) Add inline healing links to Qxal's Blood Siphon
-   (Dire Weasel) Add light automation to Abysium Horror's Green Glow and Jellyfish Lamp
-   (Dire Weasel) Add spell effect for Wooden Fists
-   (Dire Weasel) Automate reach for Gallowdead's Charge Chain
-   (Dire Weasel) Fix formatting in Glass River Midge Attach
-   (Dire Weasel) Normalize damage links in Burning Grasp description
-   (Dire Weasel) Update automation for Spriggan's Enraged Growth and Bully's Bludgeon
-   (Dire Weasel) Standardize Meliosa's Leshy names and update automation
-   (Dire Weasel) Add automation for Capritellix's Shift Mood skill bonus
-   (Dire Weasel, Drental) Fix several compendium actors with errant prototype token names
-   (Dwim) Automate Fatal Bullet feat
-   (pedrogrullada) Add spell effect for Phase Familiar
-   (stwlam) Have temporary hit points from Inexorable Iron apply immediately upon adding effect
-   (Supe) Implement Nanite Surge status bonus
-   (Tikael) Add Player Core spells from War of Immortals Playtest
-   (Tikael) Add spell effect for Anima Invocation
-   (Tikael) Fix damage of Frostbite

## 5.4.2

### System Improvements

-   (Supe) Show party permission to GM in header
-   (Supe) Allow custom domains for inline damage rolls

### Bugfixes

-   (stwlam) Fix edge case where duplicate aura effects were sometimes being applied
-   (stwlam) Fix choice set prompt when homebrew item button is clicked
-   (stwlam) Fix compendium browser search by ability category
-   (stwlam) Fix issue causing some auras to not grow when replaced by larger aura with same slug
-   (Supe) Fix barbarian specialization abilities that keyed off greater weapon specialization
-   (Supe) Hide sidebar activate-party and create-member buttons from players

### Data Updates

-   (Abaddon) Fill source for Weapon Infusion effect
-   (Dire Weasel) Add automation for several NPC abilities
-   (Dire Weasel) Add inline checks to several NPC abilities
-   (Dire Weasel) Brush up Geist's Haunt and Elk's Hoof
-   (Dire Weasel) Fix Suli Dune Dancer's Elemental Assault traits
-   (Dire Weasel) Refresh copies of Ice Storm and Lightning Storm
-   (Dire Weasel) Update automation for Sounrel's Accursed Claws
-   (Dire Weasel) Update Ice Storm description and add level damage link
-   (Tikael) Add inline checks to several feats missing them

## 5.4.1

### System Improvements

-   (Supe) Save active party folder state and default to expanded

### Bugfixes

-   (stwlam) Add additional damage types from weapon infusion effect
-   (stwlam) Fix P keybind fetching active party
-   (stwlam) Refrain from deleting class features granted by feats when lowering PC level
-   (Supe) Fix deviant ability proficiencies that extend spell DCs
-   (Supe) Fix responsiveness of other parties folder
-   (Supe) Fix rolling checks for items-only spellcasting entries

### Data Updates

-   (Abaddon) Fix source for Psychic's Daze effect
-   (Dire Weasel) Add automation for several NPC abilities
-   (Dire Weasel) Add automation for Vocal Warm-Up
-   (Dire Weasel) Brush up Cinder Dispersal and Lucky Stabs
-   (Dire Weasel) Add automation for Weapon Master's Swift Blow
-   (Dire Weasel) Automate Moonlight Ray good damage
-   (Dire Weasel) Brush up NPC Skewer automation
-   (Dire Weasel) Update Ulgrem-Axaan's Territorial Rage
-   (stwlam) Add necessary class features to kineticist dedication
-   (Supe) Add toggle for pivot strike
-   (Surge) Have Soul Warden Dedication grant blue light
-   (Tikael) Fix inline actor level references in feats

## 5.4.0

### Highlights

-   The system now has a Party actor type. It is very shiny and does quite a bit!
-   A significant amount of work has been put into automating features of the Kineticist class.

### New Features

-   (stwlam) Add handling of Elemental Blast
-   (stwlam) Add support for including self-applied effects in ability/feat items
-   (Supe, Allistaar) Add party actor and sheet

### System Improvements

-   (Drental) Add keybind (default of "P") to toggle party sheet
-   (stwlam) Improve system support for Apex items (with and without ABP)
-   (stwlam) Handle precision-damage weakness and resistance
-   (stwlam) Add icon to cue which strike-damage button to click on chat messages
-   (stwlam) Add management of ABP Apex increase to attribute builder
-   (stwlam) Add support for multiple selectors in Damage Dice and Note rule elements
-   (stwlam) Alert user on PC sheet when there are unallocated attribute boosts
-   (stwlam) Create toggle macro when dropping conditions in hotbar
-   (stwlam) Make all chat messages pop-outable
-   (stwlam) Add externally accessible CSS variables for rarity and damage-type colors
-   (stwlam) Add `removeAfterRoll` property to FlatModifer REs
-   (Supe) Convert weapon specialization to rule elements
-   (Supe) Enable roll notes for damage-received
-   (Supe) Add search filter to roll inspector
-   (Supe) Add way to track partial attribute increases in manual-entry mode
-   (Supe) Add cue to alert user when their PC's armor is equipped but not invested
-   (Supe) Support restricting spell/inline dice overrides by damage type
-   (Supe) Allow Trick Magic Item counteractions

### Bugfixes

-   (Dire Weasel) Update armor usage when category changed to shield
-   (Dire Weasel) Fix rectangle templates and fix Force Cage to be cube
-   (Dire Weasel) Emit item name and UUID for remaining categories of rule element warning messages
-   (stwlam) Acquire rule-element notes for all damage rolls, regardless of source
-   (stwlam) Fix calculation of familiar AC modified by effects
-   (stwlam) Fix improvised and kickback penalties not appearing on PC sheet
-   (stwlam) Fix overwriting proficiency in light barding on PC actors (impacts Companion Compendia module)
-   (stwlam) Fix handling of container items' worn bulk
-   (stwlam) Prevent effects that expire at end of current turn from immediately expiring when not in encounter mode
-   (stwlam) Have ghost touch weakness increase damage only once instead of once per damage instance
-   (stwlam) Prevent doubling of splash damage dice on NPC attacks
-   (stwlam) Show all property runes on ABP magic items embedded in loot actors
-   (Supe) Accept modifier adjustments for multiple attack penalty
-   (Supe) Include spellcasting roll options in damage rolls
-   (Supe) Fix detection of animal companions for some types of system automation
-   (Supe) Use item level when available as fallback value in @Damage expressions referencing actor level

### Data Updates

-   (Abaddon) Fix description/source typos and inline damage formulas in several NPCs & items
-   (chrpow) Fix description of Level 3 Gate Attenuator Item
-   (Dire Weasel) Add "+1 Status to All Saves vs. Magic" to Mummy Prophet Of Set
-   (Dire Weasel) Add aura effect for Beacon of the Rowan Guard
-   (Dire Weasel) Add automation for Dazing Blow, Doprillu, Heretic's Smite, Irrepressible (Halfling), King Merlokrep's Hampering Strike, Imperious Retreat, Pearlescent Pyramid, Polished Pebble, Shoulder to Shoulder, Skirmishing Dash, Unshakable Grit, Resonant Guitar, Spiritual Aid, Wynsal's Formation Attack
-   (Dire Weasel) Add effect for Bloodseeker Beak, Death Knell, Guardian Staff, Haste spell, Sharkskin Robe, Strum of Thunder
-   (Dire Weasel) Add metal variants and bleed damage link to Needle Darts
-   (Dire Weasel) Add missing hazards from Impossible Lands
-   (Dire Weasel) Add save link to Aerial Boomerang
-   (Dire Weasel) Add TokenLight to Shard of the Third Seal
-   (Dire Weasel) Add Underwater weapon property rune
-   (Dire Weasel) Automate Quoppopak Tentacle Stab damage override
-   (Dire Weasel) Brush up data and automation for Azarim, Ji-yook's Foxfire Blast, Spelunker, Thoqqua, Wisps' In Concert ability
-   (Dire Weasel) Update Everstand Stance to use ItemAlteration
-   (Dire Weasel) Fix feat types of Flowering Path and Growth Spell
-   (Dire Weasel) Fix formatting in Erraticannon description
-   (Dire Weasel) Fix Glass Shield's spell effect hit points
-   (Dire Weasel) Fix Hagegraf Royal Guard Darkvision to be correct ability
-   (Dire Weasel) Fix Immolis' Heat Beam DC
-   (Dire Weasel) Fix level of Phantom Footsteps
-   (Dire Weasel) Fix malformed damage links in Life-Giving Form
-   (Dire Weasel) Fix Mother Maw inline roll
-   (Dire Weasel) Fix Sawtooth Saber bulk
-   (Dire Weasel) Fix rule elements in Aerial Cloak and Eat Fire
-   (Dire Weasel) Fix source of Soulbound Doll (Sky King's Tomb)
-   (Dire Weasel) Move Conch of Otherworldly Seas' Voice of Oceans automation to effect
-   (Dire Weasel) Refresh copies of feats, spells, and other abilities on many compendium actors
-   (Dire Weasel) Remove object immunity from Spell Pitchers
-   (Dire Weasel) Update Atmospheric Staff and Drazmorg's Staff of All-Sight to be weapons
-   (Dwim) Fix Lesser Dragonstorm (AoA) missing electricity damage
-   (Dwim) Fix Phylactery of Faithfulness (greater) Religion bonus
-   (In3luki) Throttle chat card button clicks to once in 500ms
-   (Jeremy) Prevent Elemental Betrayal from showing an attack button
-   (LebombJames) Create an effect for Cinder Gaze, Fix name of Ash mystery, add maneuver defense modifiers
-   (reyzor1991) fix Effect: Dazzled's expiration
-   (SpartanCPA) Add additional dice to Fiery Body effect
-   (SpartanCPA) Add Dice to Corrosive Body Effect
-   (stwlam) Add aura and spell effect for Angelic Halo
-   (Supe) Add frequency alteration from Consistent Surge
-   (Tikael) Add an effect for Devise a Stratagem
-   (Tikael, Zullock) Add automation for gate junctions
-   (Tikael) Add automation for Kinetic Aura
-   (Tikael) Add automation for The Brass Dwarf
-   (Tikael) Add Malevolence condition
-   (Tikael) Add elemental blast choices to actor data
-   (Tikael) Add Goloma trait to Goloma ancestry
-   (Tikael) Add missing Decompose action
-   (Tikael) Add many applied effects
-   (Tikael) Add removeAfterRoll to Guidance spell effect
-   (Tikael) Automate Blasting Beams deviant ability
-   (Tikael) Automate inventor's Offensive Boost
-   (Tikael) Automate Kineticist feat choices
-   (Tikael) Automate Manifold Modifications
-   (Tikael) Automate several frequency alterations
-   (Tikael) Brushup automation for Swashbuckler finishers
-   (Tikael) Brushup sorcerer bloodlines
-   (Tikael) Change several AV actors' persistent-damage notes to actual persistent damage
-   (Tikael) Clean up inline damage rolls on impulses
-   (Tikael) Fix broken inline class DCs
-   (Tikael) Fix data references in kinetic aura effects
-   (Tikael) Fix filter on Through the Gate feat
-   (Tikael) Fix name of Witchwyrd Beacon
-   (Tikael) Grant Act Together and Share Senses actions to Summoners
-   (Tikael) Localize blast labels and add traits
-   (Tikael) Move spoilers on artifacts to GM notes
-   (Tikael) Remove non-functional sense rule elements from sense good/evil
-   (Tikael) Tone down the light on Gliminal
-   (Tikael) Improve automation for Sparkling Targe
-   (TMun) Convert Ancient Dust to non-text based persistent damage application
-   (TMun) Update description to Tales in Timber armor to link ritual

## 5.3.2

### Bugfixes

-   (stwlam) Fix display of battle form attack modifiers on PC sheet
-   (stwlam) Fix issue causing auras to stop transmitting effects when multiple scenes have tokens for same actors

### Data Updates

-   (Abaddon) Fix major vigilant eye description
-   (Abaddon) Fix greater clockwork shield description
-   (chrpow) Remove reference to _scorching ray_ from _blazing bolt_'s description
-   (chrpow) Remove Persistence of Memory ability from Shadow King's statblock
-   (chrpow) Add duration and traditions to One with Stone
-   (chrpow) Add Shory Language from Stolen Fate Player's Guide
-   (chrpow) Fix localization of Composite trait
-   (SpartanCPA) Fix action type of "Too Angry to Die"
-   (stwlam) Add Swallow-Spike armor property runes
-   (stwlam) Add Versatile Poison trait
-   (stwlam) Force attribute modifier of Spellshot class DC to be intelligence
-   (Tikael) Fix immunities of Choking Tethers hazard
-   (Tikael) Add area to Grasping Grave focus spell
-   (Tikael) Add spell DC to Obrousian
-   (Tikael) Fix inline damage of Eldritch Flare

## 5.3.1

### System Improvements

-   (Supe) Support more formulas using math terms in @Damage
-   (stwlam) Show GMs remaster changes journal entry once on startup

### Bugfixes

-   (Kim) Fix issue preventing some adventure reimports
-   (stwlam) Fix attribute boost buttons sometimes not reflecting being clicked
-   (stwlam) Respect `overrideTraits` (and its absence) in @Damage expressions
-   (Supe) Add "damage" selector to @Damage
-   (Supe) Handle top-level math terms and subtraction in @Damage
-   (Supe) Assume actor is level 1 in @Damage instead of skipping
-   (Surge) Display vehicle source in description tab

### Data Updates

-   (Abaddon) Fix Bravery Baldric descriptions
-   (Abaddon) Fix Spiderfoot Brew item variants
-   (abrault) Fix spell-save button in chat cards
-   (dellatorreadrian) Fix searching actions in Compendium Browser using text and type at the same time
-   (Roxim) Add automation for Martial Performance feat
-   (stwlam) Migrate bracketed AE-likes modifying ability scores (used by Companion Compendia eidolons)
-   (Tikael) Add _Translate_ to list of renamed spells
-   (Tikael) Automate Bristle's inline damage increase
-   (Tikael) Change the Kinetic Gate feature to be renamed with selected choices
-   (Tikael) Fix broken links in remaster journal, add language changes
-   (Tikael) Move more inline rolls to the new damage format
-   (Tikael) Backfill frequencies for most NPC actions
-   (TMun) Add knockdown to cinder wolf strikes from PFS 1-14

## 5.3.0

### Highlights

-   Rage of Elements content is in. As usual with data entry from larger volumes, this is the initial pass, to be followed up with QA and automation passes.
-   A new syntax for inline rolls, `@Damage`, has been added. This has additional features & options compared to basic Foundry `/roll` expressions, such as support for pulling in modifiers and additional damage dice.

### New Features

-   (Supe) Add @Damage inline rolls

### System Improvements

-   (stwlam) Remove ability scores, rename "ability modifiers" to "attribute modifiers"
-   (stwlam) Add "Clear Placed Templates" button to area-effect spell cards
-   (stwlam) Add support for thrown weapons with reload values of 0

### Bugfixes

-   (stwlam) Fix issue causing repeating-weapon magazines to be consumed too quickly
-   (stwlam) Fix check for Deny Advantage
-   (stwlam) Fix issue causing some rule elements that check effect origins to not function at key points
-   (stwlam) Initialize apply homebrew elements early enough for utilization by rule elements
-   (stwlam) Fix numeric predication comparisons when no right-hand operands are found
-   (Supe) Fix elite/weak adjustment for cantrips
-   (Supe) Fix issue causing CPUs to be pegged while collecting information to present choice set dialogs

### Data Updates

-   (Abaddon) Fix Game Hunter Dedication prerequisite
-   (Dire Weasel, Dogstarrb, Roxim, SpartanCPA, Tikael, TMun) Add content from _Rage of Elements_
-   (Dire Weasel) Add rule elements to Aquatic Ambush creature ability
-   (Dire Weasel) Add effect for Replenishment of War
-   (Dire Weasel) Add spell effect for False Life
-   (Dire Weasel) Add swim speed to Drowned Mummy
-   (Dire Weasel) Brush up Effect: Dragon Turtle Scale and Effect: Bronze Bull Pendant
-   (Dire Weasel) Fix action cost and traits of Focusing Hum
-   (Dire Weasel) Fix copies of Ferocity missing death note
-   (Dire Weasel) Set the ability on the NPCs casting statistic
-   (Drental) Add effect for Root Magic feat
-   (hotdog) Add images to several weapons missing them
-   (n1xx1) Fix title case of at-will and constant spells
-   (redeux) Add missing attribute boosts for 4 iconic PCs
-   (SpartanCPA) Remove Spell School traits from Bestiary Glossary items
-   (SpartanCPA) Update Glossary Abilities to @Damage
-   (stwlam) Add critical specialization to Inventor Weapon Expertise (when attacking with a weapon innovation)
-   (stwlam) Have Godless Helaing feat add 5 additional healing received when called for
-   (stwlam) Add status penalty to healing received in Life curse effect
-   (stwlam) Limit moderate life curse effects to PCs with Oracle class
-   (stwlam) Migrate in-universe languages renamed in Rage of Elements
-   (stwlam) Rename all uses/mentions of "flat-footed" to "off-guard"
-   (Surge) Add missed vehicles from G&G and SoT
-   (Surge) Fix display of saving throws on sheets of vehicles with broken condition
-   (Tikael) Add new Player Core preview spells, alter existing spells
-   (Tikael) Add journal entry explaining system handling of remaster changes
-   (Tikael) Add Scions of Domora archetype journal entry
-   (Tikael) Change many compendiums item descriptions to utilize new inline @Damage syntax
-   (Tikael) Change cooldown wording on several abilities to recharge
-   (Tikael) Change harrow court items to class or spell DC
-   (Tikael) Improve automation of Flame Wisp
-   (Tikael) Remove penalty for amphibious and aquatic unarmed strikes underwater
-   (Tikael) Remove some duplicate PFS actors
-   (TMun) Add PFS 4-99 errata
-   (TMun) Correct the price of Starsong Nectar from _Treasure Vault_

## 5.2.3

### Bugfixes

-   (stwlam) Fix check for whether a feat can be taken multiple times in choice set rule elements
-   (stwlam) Fix several display issues with effects panel
-   (stwlam) Fix version check in workaround of upstream encounter-creation issue
-   (stwlam) Set label for familiar's attack-roll statistic
-   (Supe) Fix action categories label in compendium browser

### Data Updates

-   (Tikael) Fix typo in trait description
-   (stwlam) Add inline check to Swallow Whole description

## 5.2.2

### System Improvements

-   (stwlam) Add handling of disease immunity

### Bugfixes

-   (stwlam) Fix stack overflow sometimes occurring when two unlinked tokens have intersecting auras
-   (stwlam) Prevent armor speed penalty from being doubly applied to derived speeds

### Data Updates

-   (Dire Weasel) Add automatic success of saving throws against cold effects to Icy Apotheosis
-   (Dire Weasel) Fix name for Blood-Pear Tree's Bloody Pear and remove Blight ability
-   (Dire Weasel) Fix resistances for Vampire Rival and Skeleton Rivals
-   (Dire Weasel) Fix usage of Handling Gloves and Twining Chains
-   (stwlam) Fix predicates in ancestors curse effect
-   (stwlam) Have Leukodaemon's aura only affect creatures
-   (Tikael, Dire Weasel) Add basic automation to Gelid Shard archetype
-   (Tikael) Fix rule elements on Twisting Tree
-   (Tikael) Utilize inline checks against defenses in several items
-   (Tikael) Add automation to Leprechaun Magic
-   (TMun) Add "Prepare the Processional" downtime activity

## 5.2.1

### System Improvements

-   (stwlam) Prevent players from opening sheets of unidentified world items

### Bugfixes

-   (stwlam) Restore object in `CONFIG.PF2E` depended upon by some modules
-   (stwlam) Fix resolution of bracketed numeric values

### Data Updates

-   (Dire Weasel) Refresh copies of Telekinetic Projectile

## 5.2.0

### New Features

-   (stwlam) Add Item Alteration rule element
-   (stwlam) Add encumbrance automation (disabled by default)

### System Improvements

-   (Cerapter) Add pack's source package after its name in brackets on the Compendium Browser's Settings tab
-   (In3luki) Fix source of error occasionally thrown while placing measured templates
-   (stwlam) Add support for always-active toggles and predicated suboptions
-   (stwlam) Add support for in-memory-only grants of condition items
-   (stwlam) Add support for targeted inline checks against specified defenses
-   (stwlam) Test aura coverage from small cluster of origin points in addition to center
-   (stwlam) Allow labels for all effect badge types
-   (stwlam) Add `xor` predication operator
-   (stwlam) Show notification when roll options are toggled from macros
-   (stwlam) Add option to reevaluate formula effect badges every turn
-   (stwlam) Fall back to prototype token for determining name visibility of speaker
-   (stwlam) Include "parent:" (i.e., the parent item of the rule element) roll options in flat modifier testing
-   (Supe) Enable incapacitation trait for physical non-weapon items
-   (Supe) Convert spell schools to traits

### Bugfixes

-   (Idle) Add isDestroyed check to the raiseAShield action
-   (Dire Weasel) Add roll-option toggles to vehicle sheet
-   (Dire Weasel) Allow Strike RE dice property to be resolvable
-   (In3luki) Show adjusted modifier on strike MAP buttons
-   (stwlam) Fix creation of battle-form strikes from strike data with no traits
-   (stwlam) Fix default radius of hearing
-   (stwlam) Fix token Z-cycling in Foundry 11.304+
-   (stwlam) Only copy signature spells to spell ranks with max slots of at least 1
-   (Supe) Restore DC adjustments to inline checks in NPC item descriptions
-   (Supe) Acquire roll options and fix roll inspector for flat checks
-   (Supe) Fix refresh of death overlay icon on setting change
-   (Supe) Add scrollbar to familiar sheet

### Data Updates

-   (Abaddon) Normalize language of spell durations, ranges, and cast times
-   (ArthurTrumpet) Fix duration of Unleash Psyche effect
-   (Dire Weasel) Add aura effect for Mist Stalker's Mist Cloud
-   (Dire Weasel) Add automation for Arrow of Death
-   (Dire Weasel) Add automation for Bloody Barber Goon's Thunk 'n' Slice
-   (Dire Weasel) Add automation for Enchanting Arrow
-   (Dire Weasel) Add automation for Garrote Master Assassin and Starwatch Commando abilities
-   (Dire Weasel) Add effects for Deadweight Mutagens, Disrupting Strikes, Evangelist's Impaling Chain, Infernal Wound, Lerritan's Tenacious Flames, Moon Frenzy, Precious Arrow
-   (Dire Weasel) Add missing Wight Spawn ability to Drazmorg
-   (Dire Weasel) Add note to Wereant Poisoner's Vitriolic Strikes
-   (Dire Weasel) Add skills to some NPCs that were missing them
-   (Dire Weasel) Add some automation for persistent damage recovery DCs
    . Add toggle for Clunkerjunker's Fall Apart.
-   (Dire Weasel) Add traits and fix bulk for Drazmorg's Staff
-   (Dire Weasel) Add traits and fix runes and materials for Spellcutter
-   (Dire Weasel) Allow City Scavenger's subsist bonus to apply to Society
-   (Dire Weasel) Automate Construct Armor hardness breaking
-   (Dire Weasel) Brush up Corrupted Priest rule elements
-   (Dire Weasel) Brush up Spirit Touch rule elements and fix uses of :trait:undead
-   (Dire Weasel) Build/Extract: Convert EphemeralEffect UUIDs between name and ID references
-   (Dire Weasel) Continue to work around upstream error thrown when encounters are created
-   (Dire Weasel) Correct Eldritch Archer Dedication level in journal
-   (Dire Weasel) Decrease persistent fire damage recovery DC on Charhide Goblin
-   (Dire Weasel) Fix missing damage types in some inline links
-   (Dire Weasel) Fix name in description of Disrupting (Greater) and Fortification (Greater)
-   (Dire Weasel) Fill some missing NPC hardness values
-   (Dire Weasel) Fix UUID in Holy Castigation's EphemeralEffect
-   (Dire Weasel) Group ActorTraits REs
-   (Dire Weasel) Make some NPC onset times blind rolls
-   (Dire Weasel) Refresh copies of Shocking Grasp, Fumbus' Charhide Goblin heritage, several NPC items
-   (Dire Weasel) Update Ahmoza Twins's Channel Element to use suboptions
-   (Dire Weasel) Update description formatting of Hunter's Dawn, Kortos Diamond, Piereta
-   (Dire Weasel) Update Effect: Ichthyosis Mutagen for persistent bleed recovery
-   (Dire Weasel) Update Effect: Impaling Chain to cascade delete Grabbed
-   (Dire Weasel) Update Ghost Charges for Quinn and Zhang Yong
-   (Dire Weasel) Update Marut's Fists of Thunder and Lightning to be always active
-   (Dire Weasel) Update Sapling Shield rule elements
-   (Dire Weasel) Update werecreature's Moon Frenzy
-   (Drental) Fix description and traits of fearless sash
-   (stwlam) Add Assisting armor property rune
-   (stwlam) Add rule element to Strong Arm feat
-   (stwlam) Add Spell Effect for Healer's Blessing
-   (stwlam) Allow thrown weapons to configured for use as ammunition
-   (stwlam) Collect note and degree-of-success adjustment synthetics for recovery checks
-   (stwlam) Fix Ancestral Paragon choice set
-   (stwlam) Increase persistent fire damage recovery DC on tar zombies
-   (stwlam) Refresh the Amiris and the Seelahs
-   (stwlam) Reimplement Shield Ally with item alterations
-   (stwlam) Have Quicksilver mutagen reduce hit points and mark the loss as unrecoverable
-   (Tikael) Add ChoiceSet to Terrain Stalker
-   (Tikael) Add content from Sky King's Tomb Player's Guide
-   (Tikael) Add localized names for each animal form
-   (Tikael) Add missing action grant to Stalwart Defender
-   (Tikael) Brushup Quasit automation
-   (Tikael) Change Order of the Gate to a class feature
-   (Tikael) Fix rarity of Bolas
-   (Tikael, stwlam) Convert Oracle curses to badged effects
-   (UristMcClaws) Add charge to Brightshade
-   (UristMcClaws) Fix traits for Lethargy Poison

## 5.1.2

### Bugfixes

-   (stwlam) Fix regression in determining battle form attack modifiers
-   (stwlam) Restore rule-element-based token effect icons
-   (Supe) Work around obscure upstream issue resulting in PC sheets becoming unopenable immediately after updating system

### Data Updates

-   (Dire Weasel) Fix stringified level for Ashen
-   (stwlam) Fix price of major cloister robe
-   (Tikael) Fix rule element in Echo of the Fallen

## 5.1.1

### System Improvements

-   (stwlam) Indicate verified compatibility with 11.305
-   (stwlam) Have token HUD show Broken for vehicles/loot and Hidden for others
-   (stwlam) Include parent items' names and UUIDs in all rule element validation warnings
-   (stwlam) Obscure token sprite if hearing/tremorsense detection filter is applied
-   (stwlam) Remove hidden tokens from vision detection
-   (Supe) Deprecate direct access of actor system data properties (`@abilities`, `@attributes`, `@details`, etc.) in roll formulas

### Bugfixes

-   (Drental) Localize "legacy flaws" in ability builder
-   (stwlam) Apply damage-type overrides to fatal damage dice
-   (stwlam) Fix issue causing players to not immediately see token light changes from rule elements
-   (stwlam) Update emulated token hover from chat messages to work with 11.304+
-   (stwlam) Fix aberrent grid highlighting when dragging cone templates
-   (stwlam) Dodge upstream error when encounters are created
-   (stwlam) Show token name when available (instead of actor name) in roll messages for skill checks and saving throws
-   (stwlam) Fix search in basic tag selector application
-   (Tikael) Add missing localization string on NPC sheet

### Data Updates

-   (Dire Weasel) Add Frequency to Rupture Stomp description
-   (Dire Weasel) Add missing traits to Shatterstone
-   (Dire Weasel) Fix category of Gathering Moss and Propulsive Leap.
-   (Dire Weasel) Add duration to Effect: Gathering Moss.
-   (Dire Weasel) Fix level and price of Grub Gloves
-   (Dire Weasel) Fix level of Bloodknuckles
-   (Dire Weasel) Group Ankhrav's Spray Acid damage
-   (Dire Weasel) Update Calikang's Suspended Animation to use suboptions
-   (Dire Weasel) Update Effect: Fiddle to include grant of flat-footed and slowed
-   (rectulo) Fix action format for highhelm stronghold plate
-   (stwlam) Add deathdrinking weapon property rune

## 5.1.0

### Data Updates

-   (SpartanCPA) Add content from Lost Omens: Highhelm
-   (Tikael) Add content from A Few Flowers More
-   (TMun) Add NPCs from PFS 4-15
-   (Dire Weasel) Add fix heightening effects of Etheric Shards spell
-   (Dire Weasel) Add effect for Swarm Form, Touch of the Moon
-   (Dire Weasel) Add missing traits to Grimbal's Drain Mind
-   (Dire Weasel) Allow PFS Hireling boons to be taken multiple times
-   (Dire Weasel) Brush up Meleeka's Blazing-Talon Surge and Mastered Rain of Embers Stance
-   (Dire Weasel) Fix cast time of Thoughtful Gift
-   (Dire Weasel) Fix damage link in Gray Prince and add line template
-   (Dire Weasel) Fix malformed link in Grand Archive Champion, Improved
-   (Dire Weasel) Fix name of Toxic Furnace's Boiling Toxin
-   (Dire Weasel) Fix range on Meteor Shield and Razor Disc
-   (Dire Weasel) Fix reach on Blood Lords Mithral Golem's Spike
-   (Dire Weasel) Fix Strike category for Throwing Shield
-   (Dire Weasel) Move Princess Kerinza's key details to GM note
-   (stwlam) Add Keep Stone as precious material
-   (stwlam) Add remaining weapon property runes from TV and LO:KoL

### System Improvements

-   (nikolaj-a, In3luki) Add support for modifiers and notes healing recipients received modifiers and roll notes
-   (stwlam) Bump max domains settable in deity-item sheet to 6
-   (stwlam) Allow setting fixed attack modifier and damage for rule-element-based NPC strikes
-   (Supe) Always skip roll dialog for flat checks

### Bugfixes

-   (In3luki) Fix revert damage button showing for lootable NPCs
-   (In3luki) Reevaluate roll notes upon rerolling checks
-   (stwlam) Add click listener to popped-out damage messages
-   (stwlam) Fix grid highlighting placement of measured templates while dragging
-   (stwlam) Incorporate flat-footed condition immunity into flanking checks
-   (stwlam) Include roll option on NPC attacks indicating whether they are magical
-   (stwlam) Fix issue causing incorrect level to be used for some incapacitation abilities
-   (stwlam) Fix issue causing compendium browser to get stuck semi-transparent and non-interactable
-   (Supe) Fix some minor visual issues with actor inventories

## 5.0.2

### System Improvements

-   (stwlam) Set toggled RollOption rule element suboptions as `rulesSelections`

### Bugfixes

-   (Dire Weasel) Localize some Treat Wounds macro strings
-   (reyzor1991) Include rarity in ancestry item roll options
-   (stwlam) Fix compendium directory search while app is popped out
-   (stwlam) Remove 11.301 `ActorDelta` workaround, add new one for 11.302
-   (stwlam) Fix editability of AC details on NPC sheet
-   (stwlam) Refrain from adding reach trait to generated NPC range attacks
-   (stwlam) Make system `Actor#temporaryEffects` getter return objects more faithful to `ActiveEffect` interface
-   (stwlam) Fix issue causing custom AC modifiers from being editable
-   (Supe) Fix scrolling behavior on limited-permission NPC and loot sheets
-   (Supe) Filter out damage dice with invalid outcomes
-   (Supe) Fix heighten level when retrieving prepared spells from chat message

### Data Updates

-   (Dire Weasel) Add automation to Skeletal Crocodile's Reconfigure ability
-   (Dire Weasel) Add missing critical hits immunity to Carnivorous Crystal
-   (Dire Weasel) Add some missing NPC auras
-   (Dire Weasel) Add speed bonus to Grace "The Rhino" Owano's Celestial Rage
-   (Dire Weasel) Automate Lomok's Powerful Will and add aura to Aura of Courage
-   (Dire Weasel) Automate the Rabbit Prince's Perfect Will and Bloody Jab
-   (Dire Weasel) Fix Displaced Robot's Divert Power rule elements and switch to suboptions
-   (Dire Weasel) Fix Seal Fate's spell type and add effect
-   (Dire Weasel) Update several RollOption roll elements to utilize suboptions
-   (Dire Weasel) Update NPC copies of spell Seal Fate
-   (Dire Weasel) Update Sky Dragon's Divine Lightning to predicate off target rather than RollOption toggles
-   (LebombJames) Add missing True Name trait to Reveal True Name feat
-   (OrangeChris) Fix rule elements on Subtle Dampeners and Otherworldly Protection
-   (putty) Add cooking ingredients from kingmaker companion guide
-   (stwlam) Add damaging-effect roll option to Aeolaeka's Liberate the Earth ability
-   (stwlam) Fix rule element in Adopted Ancestry feat
-   (stwlam) Prevent ancestral weapon proficiencies from cascading
-   (stwlam) Prevent Order Explorer (Leaf or Storm) from granting focus points
-   (stwlam) Remove domains compendium, migrate @UUID links
-   (Tikael) Add missing gravity trait localization
-   (Tikael) Clean up creature ability glossary entries
-   (Tikael) Fix damage in Oppali statblock
-   (Tikael) Fix localization of unarmed attack resistance

## 5.0.1

### System Improvements

-   (stwlam) Add heatsight as sense type
-   (stwlam) Display progress bar during system migrations
-   (stwlam) Add vehicle hardness processing to damage application
-   (Supe) Stack items acquired or purchased from the compendium browser

### Bugfixes

-   (cdverrett94) Add core Append Number and Prepend Adjective fields to Prototype Token Config
-   (In3luki) Fix broken thumbnails in compendium sidebar `JournalEntry` search results
-   (In3luki) Fix issue causing vehicle sheet to be unopenable
-   (stwlam) Update format of source links generated in spell consumable descriptions to V11 standard
-   (stwlam) Fix compendium drag & drop functionality
-   (stwlam) Fix style issue in PC sheet's advanced alchemy template

### Data Updates

-   (Cora) Replace core compendium pack banner images
-   (Dire Weasel) Add effects for Crushing runes
-   (Dire Weasel) Move Parsus' key details to GM note
-   (Dire Weasel) Update Cyclops Bully's Terrorizing Swing rule elements and localize
-   (stwlam) Add rule elements to Snaring Anadi heritage
-   (stwlam) Update Hero Point deck to paged format, migrate UUIDs to V11 format
-   (Tikael) Add inline save to Draugr curse
-   (Tikael) Improve automation of Shield of the Unified Legion
-   (TiloBuechsenschuss) Add rule elements to Archer's Aim

## 5.0.0-beta2

### Bugfixes

-   (In3luki) Fix manual drawing of measured templates
-   (In3luki) Hide buttons to generate roll tables in compendium browser from non-GMs

### Data Updates

-   (Dire Weasel) Make Awful Approach recharge rolls blind
-   (stwlam) Fix some settings being returned with wrong values due to upstream issue
-   (stwlam) Fix broken links in some GM notes on compendium items

## 5.0.0-beta1

### New Features

-   (In3luki, stwlam, Supe) Add support for Foundry VTT version 11
-   (Drental) Port over V11 pronouns field to system player config template
-   (In3luki) Enable creation of Roll Tables from Compendium Browser search results

### System Improvements

-   (Dire Weasel) Mystify scrolls and wands when GM drops spell onto an actor sheet while holding the ALT key

### Bugfixes

-   (Dire Weasel) Fix language of warning message emitted by AdjustDegreeOfSuccess rule element
-   (oWave) Fix issue with information passed to spell variant chat messages

### Data Updates

-   (Dire Weasel) Add Aura rule elements to Tormented
-   (Dire Weasel) Add automation to Halo
-   (Dire Weasel) Add burst template to Blindpepper Bomb
-   (Dire Weasel) Add damage links to Aroden's Hearthstone, Potions of Retaliation, and Capsaicin Tonic
-   (Dire Weasel) Add effects for Potions of Resistance
-   (Dire Weasel) Add link to effect for Kreeth-Ni's Wrath of Spurned Hospitality
-   (Dire Weasel) Fix action symbols in Instinct Crowns
-   (Dire Weasel) Fix bonus in Clarity Goggles description
-   (Dire Weasel) Fix damage for Agorron Guard Claw. Add scythe to Tenebric Giant inventory.
-   (Dire Weasel) Fix descriptions of entrench melee and entrench ranged
-   (Dire Weasel) Fix radius of Burning Blossoms
-   (Dire Weasel) Fix rule elements for Telekinetic Slip
-   (Dire Weasel) Fix some Agents of Edgewatch NPCs
-   (OrangeChris) Add maxItemLevel to Gadget Specialist rule element
-   (OrangeChris) Add rule elements to Exemplary Finisher
-   (stwlam) Fix ephemeral effect transmitted by Holy Castigation feat
-   (stwlam) Fix range increments and maximum ranges on battle form attacks
-   (stwlam) Fix Twisting Tree damage die upgrade
-   (stwlam) Move April Fools bestiary creatures to Paizo Blog Bestiary
-   (Tikael) Add content from Pathfinder Wake the Dead #1
-   (Tikael) Fix rule elements on Munavri Spellblade
-   (Tikael) Organize compendiums into folders
-   (Tikael) Remove non-existant note from Track macro

### System Improvements

-   (Dana) Add shorthand syntax for multiple rollable check buttons
-   (nikolaj-a) Add Aid action implementation
-   (Supe) Convert familiar abilities to the action item type, add abilities frequency display to familiar sheet
-   (xdy) Increase/decrease item quantities by 5 if shift-clicking and by 10 if ctrl-clicking
