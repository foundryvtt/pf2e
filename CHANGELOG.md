# Changelog

## Version 3.1.3

### Bugfixes
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
