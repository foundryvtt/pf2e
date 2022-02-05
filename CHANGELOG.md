# Changelog

## Version 3.3.1

### Bugfixes
* (Chup) Fix display issue on PC sheet when max HP is a single digit
* (stwlam) Fix handling of third-party compendium imports
* (stwlam) Fix scale-change detection for small tokens
* (stwlam) Fix issue preventing adding more than one of the same feat that grants other feats
* (stwlam) Fix underyling issue causing Paragon's Guard effect to not work

### Core System Improvements
* (stwlam) Apply range penalties to NPC strikes when applicable

### Data Updates
* (rectulo) Fix a typo in swashbuckler class
* (rectulo) Fix typos in the first table of the swashbuckler class
* (SpartanCPA) Add template buttons for higher action uses of Ki Blast
* (stwlam) Grant Alchemical Crafting with Herbalist and Poisoner dedication feats
* (Tikael) Add Resistance rule element to Stormsoul feat
* (Tikael) Add slugs to Heaven's Thunder effect
* (Tikael) Correct 3.3 changelog credits
* (Tikael) Grant the Attack of Opportunity reaction with the class feature
* (Tikael) Grant the Rage action with Barbarian Dedication
* (Tikael) Prevent multiclass barbarians from getting a feat from Fury Instinct
* (Tikael) Remove unnecessary rule elements on vision ancestry features


## Version 3.3.0

### New Features
* (In3luki) Rewrite most of compendium browser, greatly improving load speed and fixing several lingering bugs
* (swtlam) Implement range-penalty calculations as well as the means to mitigate/ignore such penalties
* (stwlam) Add setting to automatically remove expired effects
* (Supe) Add support for spell-damage bonuses, featuring most prominently in Dangerous Sorcery. In rule elements, use @spell to access the spell's data.

### Bugfixes
* (Cerapter) Propagate homebrew feat traits to actions
* (Chup) Fixed css of damage card when popped out
* (Chup) Fix position of effects panel on collapsed sidebar
* (Chup) Fix hazard sheet html tags in stealth description
* (Chup) Fix sluggified actions not working in inline buttons, add possibility to use...
* (JDCalvert) Consume Ammunition from Chat Card Strike
* (JDCalvert) Fix token-to-token distance calculation
* (stwlam) Fix drop handling when dropping document through transparent compendium browser to actor sheet
* (stwlam) Detect token scale change despite very unequal token icon dimensions
* (stwlam) Display token name in place of actor name for limited-permission NPCs
* (stwlam) Fix damage dice not getting excluded by battle forms
* (stwlam) Work around Foundry bug in which token default configuration is ignored for compendium imports
* (stwlam) Fix issue causing sickened and frightened conditions to penalize movement speed
* (Supe) Add speaker to fast healing and temp hp messages

### Core System Improvements
* (Apikoros) Gray out npc spells tab when npc does not have any spells
* (Apikoros) Pass isFromConsumable as a flag on chat messages created by spells, to properly exclude dangerous sorcery bonus for consumables
* (Chup) Adjust player/vehicle sheet sidebar colors to follow a consistent color scheme
* (Chup) Resize player/vehicle sheet sidebar headers, further refactor sidebar CSS
* (JDCalvert) Add range-increment and reload roll options
* (JDCalvert) Implement shorthand for upgrading die size in Damage Dice rule elements
* (stwlam) Support array "adds" with AE-like rule elements
* (stwlam) Remove flatbonushp, levelbonushp, flatbonussp, and levelbonussp from PC data and sheet
* (stwlam) Add optional ChoiceSet parameter to record item selection's slug instead of its UUID
* (stwlam) Migrate all "mundane-damage" and almost all "damage" RE selectors to "strike-damage"
* (stwlam) Add Adjust Modifier and Adjust Strike rule elements to facilitate implementing range-increment rules
* (Tikael) Run DamageDice's diceNumber through resolveValue
* (Supe) Create actor.skills, a record of skill statistics for checks and dcs. Modules should use this going forward instead of actor.data.data.skills.
* (Supe) Display an item's UUID on item sheets for easy copying
* (Supe) Allow event as a parameter to statistic again for modules and macros

### Data Updates
* (Abaddon) Brush up final 1/3 of Bestiary 1 (over 100 creature stat blocks)
* (Abaddon) Improve rule element localization for bestiary 1 - part 1
* (Abaddon) Add creatures and hazards for PFS 3-09
* (Abaddon) Fix faerie dragon spellcasting entry order
* (Avery) Fix rule elements on Quicksilver Mutagen effects
* (Drental) add PFS Scenario 3-08 Creatures
* (Friz) Add inline save and correct damage of Javelin of Lightning
* (Friz) Add Usage to description of talismans
* (InfamousSky) Add leveled damage to Explode action
* (InfamousSky) Add leveled damage to Megavolt feat
* (InfamousSky) Fix Invisibility rune typo
* (InfamousSky) Fix Repeating Heavy Crossbow price
* (InfamousSky) Fix Seek action spelling mistake
* (InfamousSky) Give Bon Mot effect icon a shadow
* (InfamousSky) Add Attack of Opportunity action
* (InfamousSky) Add effects for Goblin Song feat
* (InfamousSky) Add leveled healing to Searing Restoration feat
* (iWantNoColor) Fix rule element for Reflexive Shield
* (JDCalvert) Add automation to Crossbow Terror
* (Kris) Fix price of Succubus Kiss drug
* (Lebombjames) Fix description of Darkvision Elixirs and Redpitch Bombs
* (Maeceus) Add flat checks for unstable to action and feat descriptions
* (Mindbane) Fix actions for One Shot, One Kill action
* (NullWolf) Replace Improved Grab on several NPCs
* (rectulo) Fix typos in Ember's Eyes feat and Oracle class
* (ricothebold) Add several dozen Feat Effect Icons
* (Roxim) Brushup EC book 1 remaining NPCs
* (SoldierC4) Add GrantItem to Munitions Crafter
* (SpartanCPA) Add Game Hunter Archetype JE
* (SpartanCPA) Adds Quest for the Frozen Flame Book 1
* (SpartanCPA) Add "Morlock" as a creature trait
* (SpartanCPA) Add Chimera variants
* (SpartanCPA) Add a description for the Magus trait
* (SpartanCPA) Ensure spell links are italicized
* (SpartanCPA) Fix name of Harvest Heartsliver action
* (SpartanCPA) Rename "Others" compendium to "Non-Iconic Pregens"
* (SpartanCPA) Update Glossary entry for Buck
* (stwlam) Add shield-hardness increase to Everstand Stance
* (stwlam) Exclude Draconic Arrogance from Natural Ambition unless the character has Dragon Instinct
* (stwlam) Add unique icon for Effect: Heroic Recovery
* (stwlam) Add the Arcane trait to melee strikes while in Arcane Cascade stance
* (stwlam) Add localization and icon for Brass Dragon form's Spikes attack
* (stwlam) Add Effect: Favorable Winds along with icon
* (stwlam) Add Stance: Paragon's Guard
* (stwlam) Fix AdjustDegreeOfSuccess RE on Aasimar Redeemer
* (Tikael) Add ChoiceSet and GrantItem to dedication feats
* (Tikael) Add area to Pummeling Rubble
* (Tikael) Add missing paragraph to Explode action
* (Tikael) Automate Dwarven Thrower
* (Tikael) Fix description of Medium Armor Expertise for Inventors
* (Tikael) Fix level of Boastful Hunter
* (Tikael) Add ChoiceGrant to basic multiclass feats
* (Tikael) Fix resistance on Fire Shield spell effect
* (Tikael) Fix rule elements on Familiar Master Dedication
* (Tikael) Improve automation of Spirit Strikes feat
* (Tikael) Make Everstand Stance an actual stance effect
* (Tikael) Update critical specializations to use localized text
* (Trist) Add GrantItem to Hellspawn feat


## Version 3.2.2

### Bugfixes
* (In3luki) Fix secret sections in journals getting stripped out by the enrichHTML handlebar helper
* (In3luki) Fix broken filter of feat browser button in the character sheet feat tab
* (stwlam) Show drop zone on UUID ChoiceSet prompts with select menus
* (stwlam) Fix premature toggling off shield-block button when shift-clicking to adjust damage application
* (stwlam) Refrain from applying healing to stamina points
* (stwlam) Restore retrieval of modifiers to AC from "all" synthetics selector
* (stwlam) Fix inclusion of damage dice from rule elements
* (stwlam) Apply weapon property runes when ABP variant permits it
* (stwlam) Fix range increments always getting set to 1
* (stwlam) Make Scene Darkness Adjuster go away when switching away from lighting controls
* (stwlam) Provide necessary data for Ancestral Paragon to include versatile-heritage ancestry features
* (stwlam) Correctly resize equipment when requested by Creature Size rule element
* (Supe) Fix effect panel refresh for players, fix fast healing effect duration

### Core System Improvements
* (stwlam) Prevent modules from acting on drop canvas data handled by the system
* (stwlam) Clamp PC level, allowing for level-0 variant rule and enough room for homebrew "mythical" campaigns
* (SoldierC4) Improve styling of Effects Panel
* (Supe) Always hide NPC fast healing regardless of setting

### Data Updates
* (Abaddon) Brushup several dozen Bestiary 1 creatures
* (rectulo) Clean up description of Magical Fortitude class feature
* (stwlam) Fix level-6 size upgrade on Elemental Form spell effects
* (stwlam) Deprioritize AE-like on Gadget Specialist so as to get correct skill rank
* (stwlam) Add ChoiceSet/GrantItem rule elements to Ancient Elf heritage
* (Supe) Add effects for crimson shroud and repair module
* (Tikael) Fix rule element for sneak attack
* (TMun) Fix number of dice on unstable megaton strike
* (TMun) Change serrating rune from consumable to equipment


## Version 3.2.1

### Bugfixes
* (SoldierC4) Prevent Effects Panel rows from moving on mouse hover
* (stwlam) Refrain from deleting bomb items upon reaching zero quantity
* (stwlam) Fix damage application to temporary hit points
* (stwlam) Fix rule elements on Third Path to Perfection
* (stwlam) Fix interactability of scene darkness slider when clicking on threshold icons
* (Tikael) Make Resilient armor with no potency runes invested (ABP)
* (Tikael) Return to token layer after placing a premade template

### Core System Improvements
* (stwlam) Add distance-measuring support for gridless scenes

### Data Updates
* (Abaddon) Brushup kobold warrior, scout, and dragon mages
* (Abaddon) Brushup dhampir mage, doppelganger, harpy, medusa
* (rectulo) Delete book reference in the description of the poppet ancestry
* (SpartanCPA) Add a longer duration longstrider effect
* (SpartanCPA) Fix Point-Blank Shot's damage bonus
* (SpartanCPA) Audit Ethereal Sailor
* (SpartanCPA) Add @Check to Marshal stances


## Version 3.2.0

### New Features
* (Eddie) Add Quick Alchemy crafting option
* (stwlam) Implement Heritage items, migrate existing heritage ancestry features to them
* (stwlam) Begin tracking relative distances between attackers and their targets, calculate Strike range increments
  * No automatic range penalties yet, but Point-Blank Shot is now automated.
* (Supe) Allow handwraps to transfer property runes
* (Supe) Implement fast healing/regeneration

### Bugfixes
* (Abaddon) Fix magic weapon name generation for weapons with three property runes and no striking rune
* (Ehlii) Fix ActorPF2e#increaseCondition not incrementing values if existing value is between min/max values.
* (Ehlii) Improve visual clarity of expended prepared spellslots
* (Cerapter) Fix CraftingFormula rule elements retrieving incorrect default batch sizes on some item types
* (Chup) Fixed character sheet navigation tab icons being slightly off-center
* (In3luki) Retrieve correct defensive proficiency when wearing light armor with no check penalty
* (SoldierC4) Fix localization of common strikes
* (stwlam) Fix bug causing stored weapon "other tags" to be wiped
* (stwlam) Fix issue causing TokenImage rule element to not activate without reloading
* (stwlam) Make label sluggification unicode-friendly
* (stwlam) Show system Token config sheet for prototype tokens
* (stwlam) Work around core bug in which keypresses on some form inputs were intercepted while typing
* (stwlam) Ignore repeat triggers of keydown event on World Clock
* (Supe) Fix Trick Magic Item and supporting rule elements
* (Supe) Fix display bug with some ignored modifiers on actor sheets

### Core System Improvements
* (Cerapter) Pre-filter compendium browser when looking up feats/features from PC sheets
* (Chup) Adjust actor sheet sidebar banner styling
* (fryguy) Remove separator from effects and conditions on NPC sidebar
* (In3luki) Allows inline checks to be affected by elite /weak templates and conditions.
* (In3luki) Extend enrichContent support to Hazards and Journals
* (SkepticRobot) Add support for increasing condition values in Effects Panel
* (SkepticRobot) Move display of conditions and other effects on NPC sheet to dedicated tab
* (SoldierC4) Remove legacy NPC sheet
* (SoldierC4) Add token floaty text for conditions and effects
* (SoldierC4) Give text editor toolbar on PC sheet a contrasting fill color
* (stwlam) Accommodate alternative ability modifiers for AC
* (stwlam) Consume consumable weapons on attack roll
* (stwlam) Remove hard-coded fist attack and replace with a Strike rule element
* (stwlam) Add ability to preset the selection of a ChoiceSet RE from a GrantItem RE
* (stwlam) Add support for predication of IWR rule elements
* (stwlam) Add support for numeric comparisons in predication
* (stwlam) Reimplement applyDamage as an instance method
* (Supe) Indicate on NPC sheets whether attacks are melee or ranged
* (Tikael) Add means of replacing the PC's default unarmed attack from Strike rule elements
* (Tikael) Allow macros to set the roll mode in the roll dialogue menu
* (Tikael) Add min/max size for CreatureSize rule element
* (Vasher) Add support for blindrolls from item chat cards
* (Vasher) Automatically set compendium browser filters when coming from feat slot

### Data Updates
* (Abaddon) Brushup many Bestiary 1 actors
* (Abaddon) Fix formatting of perception details
* (Abaddon) Correct rune and critical specialization localizations
* (Abaddon) Brushup estiary Effects
* (Abaddon, SoldierC4, Tikael) Expand current localization support
* (Arthur Trumpet) Consolidate Ki Form spell effect
* (Attila) Correct Rarity of Beastkin and Ganzi heritages
* (Drental) Automate item granted by Pilgrim's Token
* (MnkyBrs) Brush up Agents of Edgewatch book 5 NPC
* (Nullwolf) Correct name of Gasping Marsh spell
* (Nullwolf) Add missing strike effect to Dream Spider
* (Rectulo) Fix formatting error in Oracle mystery
* (Rectulo) Fix formatting of several spells
* (Rectulo) Fix formatting of Staff of Providence and Spider Guns
* (Roxim) Brushup EC book 1 chapters 1 through 3 actors
* (SpartanCPA) Brush up hags
* (SpartanCPA) Standardize formatting of hazard text
* (SpartanCPA) Move NPCs to standard rage effect
* (SpartanCPA) Fix common formatting errors
* (SpartanCPA) Correct typing of Coil Spy's bonuses
* (SpartanCPA) Audit Fall of Plaguestone NPCs
* (SpartanCPA) Rename generic Age of Ashes actor
* (SpartanCPA) Brush up PFS 1-15 actors
* (SpartanCPA, SoldierC4, stwlam, Tikael, VestOfHolding) Add choices to classes, features, feats, and heritages
* (SoldierC4) Correct rule elements for many ancestries and heritages
* (SoldierC4, Tikael) Move inlines saves to new @Check format
* (stwlam) Add clan dagger ancestry feature
* (stwlam) Fix filters for Natural Ambition
* (stwlam) Consolidate Path to Perfection
* (stwlam) Update Spell Effect: Shield to be usable for blocking
* (Tikael) Automate selection for Sterling Dyanmo Dedication
* (Tikael) Add initiative bonus while avoiding notice with cover
* (Tikael) Correct ability used by un/holy water strikes
* (Tikael) Correct minor errors in archetype journals
* (Tikael) Correct description of Grand Bazaar alchemical bombs
* (Tikael) Add effect for Catfolk Dance
* (Tikael) Correct text formatting of Heal and Harm
* (Tikael) Automate Reflexive Shield
* (Tikael) Standardize text and implementation of NPC two handed dX strikes
* (Tikael) Fix damage and scaling of Overdrive
* (Tikael) Add missing ritual from Agents of Edgewatch
* (Tikael) Automate Monastic Archer
* (Tikael) Add skill bonuses to Ageless Patience
* (Tikael) Add Witch Lessons as class features
* (Tikael) Fix action type of Call Companion activity
* (Tikael) Add equipment resizing to Enlarge and Giant's/Titan's stature effects
* (Tikael) Add missing Agents of Edgewatch variant NPC
* (Tikael) Finish brushup of Age of Ashes NPCs
* (Tikael) Correct bonuses of Ki Form effect
* (Tikael) Remove deprecated inline buttons
* (Tikael) Add missing language and correct spelling of Minatan
* (Tikael) Remove old notes on spell effects
* (TMun) Remove preset token art
* (TMun) Brushup many PFS actors
* (TMun) Correct errors in Rowan Rifle
* (TMun) Add missing items from Grand Bazaar


## Version 3.1.3

### Bugfixes
* (SoldierC4) Fix visibility of loot-sheet inventory when scrolling
* (stwlam) Fix issue causing alternative ability modifiers to not appear correctly on check dialog
* (stwlam) Remove non-functional updating NPC attitude from token disposition: will restore (with functionality) in next release

### Data Updates
* (Abaddon) Brushup even more zoo animals from Bestiary 1
* (Dooplan) Fixed uniformity issues with some book references
* (NullWolf) Correct Hunter's Aim rule elements
* (SpartanCPA) Remove Primal Innate Spells action from Grogrisant
* (rectulo) Fix formatting and remove a link in the Hot Foot feat of the Pistol Phenom archetype
* (stwlam) Fix formulas with actor data on BattleForm REs
* (stwlam) Skip Swashbucklers in Weapon Expertise consolidation
* (Tikael) Standardize "Cant speak..." text


## Version 3.1.2

### Bugfixes
* (stwlam) Fix listener on button to add weapon proficiencies
* (stwlam) Fix issue sometimes causing familiars to be unimportable
* (stwlam) Fix issue sometimes causing multiple ability modifiers to apply to damage

### Core System Improvements
* (Cerapter) Allow class features and feats to be infinitely nestable
* (stwlam) Show levels for class features on PC sheet

### Data Updates
* (Abaddon) Brushup various zoo animals from Bestiary 1
* (Abaddon) Brushup Bestiary 1 air & water elementals, nosoi, morrigna
* (Abaddon) Update Abomination Vaults erinys variant and barcumbuk
* (Abaddon, stwlam, Tikael) Make several labels and other text from rule elements localizable
* (Carpebiem) Correct Barbed Vest item type and price of Greater Crushing Rune
* (NullWolf) Correct level of Giant Pirate Skeleton
* (NullWolf) Correct components of Scorching Ray
* (rectulo) Fix inline roll formula label in description of Bullet Dancer Burn
* (stwlam) Add ChoiceSet/GrantItem to Multitalented feat
* (stwlam) Set correct Weapon Expertise feat for Swashbuckler
* (stwlam) Add Alchemy feature to Alchemist class, along with grant of Alchemical Crafting
* (stwlam) Refresh several alchemy-related and a couple other icons
* (stwlam) Shorten item names of arcane schools/theses, hunter's edges, oracle mysteries, rogue rackets, and swashbuckler styles
* (stwlam) Fix rendering and choice resolution of EffectTarget rule element
* (stwlam) Have the Duelist Dedication feat grant Quick Draw
* (stwlam) Have Alchemist Dedication grant Infused Reagents and Alchemical Crafting
* (stwlam) Skip deleting granted physical items
* (stwlam) Implement weapon-group proficiency increases from Fighter Weapon Mastery and Weapon Legend
* (Tikael) Fix non-functional traits on some NPCs
* (Tikael) Remove more parenthetical traits in strike descriptions
* (Timingila) Fix broken strike on PFS creature


## Version 3.1.1

### Bugfixes
* (SolderC4) Fix rendering issues on loot-actor sheets
* (stwlam) Correctly resolve weapon-proficiency combinations (e.g., Dwarven Weapon Familiarity and Fighter Weapon Mastery)
* (stwlam) Fix equipment summary toggle on NPC sheets
* (stwlam) Fix migration of bracketed rule-element formulas (as found in, e.g., Untrained Improvisation)

### Data Updates
* (Abaddon) Brush up Bestiary 1 earth elementals
* (n1xx1) Add ChoiceSet rule elements for the Bard's Muse class feature and Multifarious Muse feat


## Version 3.1.0

### New Feature
* (Eddie) Add menu for hiding character sheet tabs

### Bugfixes
* (stwlam) Fix issue preventing unlinked actors from having their token-effect icons updated
* (stwlam) Prevent loot actors from constructing their items' rule elements
* (stwlam) Fix issue causing token vision to not refresh for players without mouse interaction
* (stwlam) Remove token-image title attribute when names are hidden from the encounter tracker

### Core System Improvements
* (andriusch) Allow using deltas (with + or - prefix) when inputting XP
* (SoldierC4) Give text editor on PC sheet buttons a legible fill color
* (stwlam, Supe) Change dice-formula data replacement to operate at actor and item instance levels
* (stwlam) Add support for numeric ChoiceSet options, implement with new Cover effect
* (stwlam) Convert LinkedProficiency RE to a more-general MartialProficiency RE
* (Supe) Hide Spell Save DC when metagame option is set
* (TheElderMindseeker) Make shift-modification of heal operative more intuitively

### Data Updates
* (SoldierC4, Tikael, TMun) Add content from Lost Omens Absalom and Monsters of Myth
* (Abaddon) Add silver dragon spellcaster variants
* (Abaddon) Brushup bestiary 1 mephits
* (stwlam) Add new precious material, Grisantian Pelt
* (stwlam) Add a ChoiceSet for fleshwarp creature size
* (stwlam) Add feat grants to Arcane School: Universalist and Natural Ambition
* (stwlam) Fill out REs on Gunslinger proficiency class features, migrate existing PCs
* (Telekenunes) Add automation for Laughing Shadow Hybrid Study
* (TMun) Add missing traits from PFS 1-24
* (TMun) Add Ranger and Rogue traits to Quick Draw
* (TMun) Update license file with missing requirements from Lost Omens books


## Version 3.0.1

### New Feature
* (stwlam) Tokens now show hovering text of hit point changes when their corresponding actors receive damage or healing

### Bugfixes
* (In3luki) Fix GhostTemplate preview persisting on the canvas
* (SoldierC4) Remove HP bar from the limited PC sheet
* (stwlam) Fix circumstantial off-by-one error of world clock weekday
* (stwlam) Fix Magic weapon name generation in non-English languages
* (stwlam) Fix soft setting of prototype token data defaults
* (stwlam) Refresh the effect tracker every turn of an encounter
* (stwlam) Fix rolling initiative from encounter tracker

### Core System Improvements
* (Abaddon) Create localized default label and error messages for @Template
* (SoldierC4) Cleanup loot sheet formatting
* (stwlam) Set default of "Pan to Speaker Token" setting to false

### Data Updates
* (Abaddon) Brushup several animal and fiends from Bestiary 1
* (Abaddon) Add gold dragon spellcaster variants
* (cepvep) Add choice prompting to Rogue, Oracle, Ranger, and Swashbuckler, Wizard, and Witch class features
* (stwlam) Correct traits on Balise Angelic Form's scimitar attack
* (SpartanCPA) Update sources for Azarketi ancestry
* (SpartanCPA) Correct NPC sources for Lost Omens: Mwangi Expanse
* (SpartanCPA) Ensure splash damage is properly typed
* (TMun) add errata from Lost Omens Ancestry Guide
* (Tikael) Add Quest for the Frozen Flame Backgrounds


## Version 3.0.0 (beta release)

### New Feature
* (In3luki) Mystify equipment when dropping onto an actor sheet while holding the ALT key
* (stwlam) Add a `GrantItem` rule element, allowing an item to bring in other items
* (stwlam) Class feature nesting: With the above, PC features and feats can now bring in other features and feats, which are displayed in a tree view on the character sheet's Features tab. Classes will need to be updated, but this release has the Dwarf ancestry as well as the Alchemist, Barbarian, and Druid classes taking advantage.

### Bugfixes
* (In3luki) Fix default deity image for new characters
* (SoldierC4) Change spell level toggle to also hide preparation shortlist
* (stwlam) Update Make an Impression action macro to reflect its actual success states
* (stwlam) Ensure item descriptions are always strings
* (stwlam) Fix pressing Enter key on PC sheet sometimes triggering the "Complete Daily Crafting" button

### Core System Improvements
* (fryguy, In3luki, Supe, stwlam) Update system to support Foundry V9
* (In3luki) Refrain from defaulting resistance and weakness selector values to zero
* (stwlam) Expand `ChoiceSet` rule elements to accommodate followup `GrantItem` rule elements
* (stwlam) Remove deprecated StatusEffects.setStatus method
* (stwlam) Add ChoiceSet/GrantItem REs to druidic orders
* (stwlam) Refine error-catching of migrations
* (stwlam) Add necessary features to automate Inexorable Iron
* (stwlam) Add check to determine whether an actor can be imported from JSON
* (stwlam) Remove ability to drag/drop unrolled combatants in tracker
* (stwlam) Make feature levels on class items editable
* (stwlam) Remove martial and formula item types
* (stwlam) Give ABP options easier-to-understand labels

### Data Updates
* (Abaddon) Bestiary 1: Add bronze and copper dragon spellcaster variants, brushup planar scions, fire elementals, brass dragon spellcasters
* (Abaddon) Brushup bestiary effects
* (ae4355) Brushup some EC book 1 actors
* (Avery) Fix Rule Elements for Spell Effect: Song of Strength
* (Bennyty) Correct area of Prismatic Spray spell
* (cepvep) Add choice prompting to Alchemist Research Field, and automatic granting of Research Field Features
* (Drental) Add acute scent and acute vision automation
* (Drental) Fix Hezle's Alignment
* (Drental) Fix max hit points of Izfitar and Deep Shadow Guardian
* (Hogantic88) Correct area of Cloudkill spell
* (Kris) Correct hit points of AV NPCs
* (PyroKitsune) Correct Inventor text formatting and rule elements
* (redeux) Add PFS scenarios 3-06, 3-07, and Bounty 17
* (SoldierC4) Fix weakness value for Corpselight
* (SpartanCPA) Add AV NPC Blurbs
* (SpartanCPA) Add a compendium for Campaign Effects
* (SpartanCPA) Add creatures from PFS 2-09
* (SpartanCPA) Add occult tradition to Blightburn Blast
* (SpartanCPA) Correct a number of bad action images
* (SpartanCPA) Fix damage for the "Crushing Wave" spell
* (SpartanCPA) Fix inline rolls buttons across packs
* (SpartanCPA) Forward Spell Range Fixes to NPCs
* (SpartanCPA) Give Hezle her staff attack
* (SpartanCPA) Remove description links to "Strike" and "Stride"
* (SpartanCPA) Replace spells of Chafkem
* (SpartanCPA) Update several spells to have placeable templates
* (stwlam) Add icons for druidic orders from Secrets of Magic
* (stwlam) Add support for ChoiceSet RE processing a list of item uuids
* (stwlam) Add support for end-of-encounter effect expiration
* (stwlam) Change all durations of stance effects to end of encounter
* (stwlam) Remove levels from names of some class features
* (Tikael) Add missing rituals and abilities to AV NPC
* (Tikael) Add toggles to Double Shot and Triple Shot feats
* (Tikael) Correct Imp skills
* (Tikael) Fix condition links in Arsenic
* (Tikael) Brush up compendium content for Age of Ashes books 2 and 3
* (Tikael) Fix small errors on actors in in AoA books 5 and 6
* (Tikael) Move compendium inline templates to (at)Template
* (Tikael) Remove parenthetical traits and quantities from descriptions
* (Tikael) Set heritages and ancestry features to level 0
* (Timingila) Add missing PFS 1-04 actors
* (Xdy) Correct spell rarity on Call the Blood and range of summoning spells
