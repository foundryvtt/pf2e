# Changelog

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
