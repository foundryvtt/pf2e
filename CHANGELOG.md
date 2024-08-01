## 6.2.0

### Highlights

-   (Ambrose, Dire Weasel, DocSchlock, Mecha Maya, redeux, Rigo, SpartanCPA, Tikael, TMun) Add Content from Player Core 2

### System Improvements

-   (nikolaj-a) Include action-specific modifiers for action check previews
-   (stwlam) Add optional `testDomains` field to AE-likes
-   (stwlam) Add support for damage alterations of base weapon damage
-   (stwlam) Automate Shockwave rune
-   (Supe) Remove repeating limitation for ammo with multiple uses

### Bugfixes

-   (FolkvangrForgent) Remove system handling of hex-grid snapping
-   (stwlam) Acquire modifier adjustments for Volley penalty
-   (stwlam) Apply item alterations to basic unarmed attack
-   (stwlam) Fix emanation snapping for large and gargantuan tokens
-   (stwlam) Correct snapped destination when drag-measuring from unsnapped origin
-   (stwlam) Resolve injected properties in AdjustDegreeOfSuccess predicates
-   (Supe) Fix saving edits on deity sheets
-   (Supe) Fix resolving nested predicates in config choice sets

### Data Updates

-   (Abaddon) Add spell variants for establish ward
-   (Abaddon) Add starshot arrow activation
-   (alephtwo) Fix Performance bonus for Dancing Scarf
-   (Ambrose) Fix formula for amped Redistribute Potential
-   (Ambrose) Update Retraining description to remaster
-   (arthurtrumpet) Add effects for new Howl of the Wild Animal Forms.
-   (Dire Weasel) Add automation for Gruhastha - Moderate Boon
-   (Dire Weasel) Brush up Goblin Zombie
-   (Dire Weasel) Fix some predicates for Revolutionary Innovation
-   (HeliumAnt) Fixed icon paths in kingdom builder when not served from the root
-   (Rigo) Add effects for Insight Coffee
-   (Rigo) Add note text for Goading Feint
-   (SpartanCPA) Add Content from The Great Toy Heist
-   (TMun) Add NPCs and Effects for PFS 6-00

## 6.1.3

### System Improvements

-   (Tikael) Allow weapon group to be resolved in Strike REs

### Bugfixes

-   (stwlam) Fix the (hopefully) remaining edge cases of Concussive trait
-   (Supe) Fix display of readonly traits in actor and item sheets
-   (Supe) Fix inline dc adjustments for elite/weak creatures
-   (Trent) Fix Escape not picking unarmed attacks with negative modifiers

### Data Updates

-   (Ambrose) Update Exploration Activities source and text to Player Core/GM Core
-   (Dire Weasel) Remove invalid alignment traits from NPC strikes
-   (rectulo) Fix lore skill in Art Tutor background
-   (reyzor1991) Add DamageAlteration to Divine Castigation
-   (reyzor1991) Add missing inline checks to several NPC abilities
-   (Tikael) Remove unmaintained GMG journal entry compendium
-   (websterguy) Fix domain on Artokus's Fire RollOption
-   (websterguy) Fix inline roll in Note text on Glutton's Jaw effect

## 6.1.2

### System Improvements

-   (stwlam) Integrate new `allowInteractive` core feature into check and damage rolls

### Bugfixes

-   (stwlam) Loosen line template snapping
-   (stwlam) Fix waypoint placement when not drag measuring
-   (stwlam) Fix several visual quirks in attack popout
-   (stwlam) Handle Concussive trait against targets having both immunity and resistance to same damage type
-   (stwlam) Restore reinforcing rune select option labels on shield sheet
-   (stwlam) Loosen line snapping restrictions for now
-   (Supe) Prevent damage alterations from disabling override dice

### Data Updates

-   (Dire Weasel) Add effect for Funereal Dirge
-   (Dire Weasel) Add effect link to Elite Duergar Taskmaster's Take Them Down!
-   (DocSchlock) Add Formula roll to Lucky Number Spell Effect

## 6.1.1

### System Improvements

-   (nikolaj-a) Add traits and roll-options parameters to /act inline links
-   (stwlam) Adjust drag measurement feature to play nice(r) with modules

### Bugfixes

-   (stwlam) Fix Concussive trait redirecting damage type to one in which the target is immune
-   (stwlam) Fix tiny tokens not traversing waypoints during drag measurement
-   (stwlam) Fix drawing of highlights from other users' drag measurements
-   (stwlam) Restore processing of roll breakdown user visibility
-   (Supe) Fix font color of unready strikes
-   (Supe) Fix hiding strikes in character sheet

### Data Updates

-   (Ambrose) Correct typo in Spit Ambient Magic damage formula
-   (nikolaj-a) Fix missing space character in Administer First Aid action description

## 6.1.0

### System Improvements

-   (Clemente) Allow editing Shield HP from token attribute bars
-   (Dire Weasel) Allow DamageAlteration rule elements to have resolvable selectors
-   (MrVauxs) Add suport for battle form rule elements to specify whether one can use their own AC if higher
-   (stwlam) Automate Concussive trait
-   (stwlam) Add simple token drag measurement support
-   (stwlam) Add environment feature region behavior (just with difficult terrain for now)
-   (stwlam) Add animation options to TokenImage rule element
-   (stwlam) Restore Z-cycling of token stacks
-   (Supe) Add support for retrieving subitems and an actor's own skills in choice sets
-   (Supe) Add roll option and AE-like RE support to hazards
-   (Supe) Add support for defining new skills from module flags
-   (Supe) Add toggle to hide strikes from stowed weapons
-   (Supe) Allow no master attribute for non-familiar pets
-   (Supe) Show error instead of silently failing when rolling inline checks for invalid actors

### Bugfixes

-   (DocSchlock) Allow item alterations of hardness to use non-integer and negative values
-   (Duncan) Add a minimum ability modifier to familiars
-   (In3luki) Rerender all created messages when a Treat Wounds macro check is rerolled
-   (nikolaj-a) Fix sending description to chat for actions with variants when no variant is specified
-   (stwlam) Fix application of two-hand trait from strike adjustments to weapon damage dice
-   (stwlam) Fix detection of item drops on tokens
-   (stwlam) Fix token defaults not being taken up on compendium-actor imports
-   (stwlam) Include weapon-compatible traits when generating weapon from shield
-   (Supe) Fix inline checks using resolve double applying penalties
-   (Supe) Prevent parties from being created in or moved into folders
-   (Supe) Fix grid snap when placing bursts and emanations
-   (Supe) Fix retrieving subitems from chat messages

### Data Updates

-   (Abaddon) Fix Reverse Engineering prerequisite
-   (Abaddon) Fix Widen the Gap prerequisites
-   (Abaddon) Update Summon Nephilim Kin to remaster text
-   (AFigureOfBlue) Fix typos in Grazing Deer hazard
-   (Ambrose) Add action to Resonant Reflection Campaign items.
-   (Ambrose) Add actions for Clawdancer dedication
-   (Ambrose) Add modification class features and rule elements for Revolutionary Innovation
-   (Ambrose) Add Eye Gems spellcasting entry for Demilich
-   (Ambrose) Add rule elements to Feral Sense and You Don't Smell Right feats
-   (Ambrose) Add SpecialStatistic rule element to Verdant Core
-   (Ambrose) Add unique icons to Action Macros
-   (Ambrose) Allow Marvelous Medicines to be used when not held
-   (Ambrose) Automate Dragon Form resistances
-   (Ambrose) Automate Ostilli Host archetype
-   (Ambrose) Automate Perception bonuses on several NPCs
-   (Ambrose) Automate remaining Elementalist and Player Core spellshape feats
-   (Ambrose) Brushup Wild Mimic feats and Winged Warrior feats
-   (Ambrose) Fix equipment on AoA NPC Bshez
-   (Ambrose) Make Resonating Fork (Major) attack roll in line with others
-   (Ambrose) Remove Dragonhide table from Dragonslayer's Shield description
-   (Ambrose) Update aid DC for Recall the Teachings action
-   (Ambrose) Update Commune description to Remaster text
-   (Ambrose) Update Crystal Luminescence to use an effect
-   (Ambrose) Update Oil of Potency description to remaster
-   (Avery) Add Action Frequency Tracking to Familiar and NPC sheets
-   (bennyty) Reword Sniping Duo label for clarity
-   (Dire Weasel) Add automation for Moderate Boon (Erastil), Hamatula's Impaling Barb, Mirage Dragon's Lunging Bite, and Worm Caller Dedication's Inexorable feat
-   (Dire Weasel) Add effect for Mana-Rattler Liniment and Vaultbreaker Ooze's Metallify
-   (Dire Weasel) Add inline damage links to Vibrant Thorns
-   (Dire Weasel) Add poisons for Howl of the Wild
-   (Dire Weasel) Automate immobilized immunity for NPC Inexorable ability
-   (Dire Weasel) Brush up deity boons and curses
-   (Dire Weasel) Brush up Howl of the Wild equipment
-   (Dire Weasel) Brush up Lion's Shield
-   (Dire Weasel) Fix errata'd price for Trollhound Pick
-   (Dire Weasel) Fix name of "Familiar of Parasitic Might"
-   (Dire Weasel) Fix Note visibility for Shanrigol's Shred Flesh
-   (Dire Weasel) Fix Ostovite's Bone Chariot weakness
-   (Dire Weasel) Fix Sceaduinar's spell list and give it void healing
-   (Dire Weasel) Make inline damage roll for Cauterize Wounds immutable
-   (Dire Weasel) Update Acid Arrow to use `@Damage` syntax
-   (Dire Weasel) Update Raise Symbol to handle unified Emblazon Armament
-   (Dire Weasel) Update Gorum's Minor Curse to alter armor and shield hardness
-   (Farling) Add automation for Crystal Luminescence feat
-   (kromko) Add public notes to Gallowdead
-   (kromko) Fix Choker of Elocution (Greater) craft requirements
-   (kromko) Fix formatting for many degree of success descriptions
-   (kromko) Fix Pernicious Spore Bomb (Lesser) RE text
-   (kromko) Fix Show the Way heightened value
-   (kromko) Fix Thaumaturge Tome Implement description
-   (kromko) Replace level with rank in actor-owned Unimpeded Stride
-   (Manuel Hegner) Fix price of Boots of Free Running (Greater)
-   (MrVauxs) Allow Debilitating Strike to receive additional suboptions from external sources
-   (MrVauxs) Automate Cooperative Soul
-   (n1xx1) Fix typo in pregenerated bleed damage formula
-   (nikolaj-a) Fix missing start paragraph in Sneak success description
-   (Razytos) Fix typo in Favored Prey
-   (rectulo) Fix range of Bramble Bush
-   (Rigo) Add "ranged 100 feet" trait and hide Blindness note in Kingmaker NPC
-   (Rigo) Add effects for Big Debut, Command Attention, and Upstage
-   (Rigo) Add resistance effect for Spirit's Mercy
-   (Rigo) Add resistance to demon attacks to Pickled Demon Tongue effects
-   (Rigo) Integrate Geomancer archetype automation with environment regions
-   (Rigo) Brush up Acrobat, Aldori Duelist, Alkenstar Agent, Chronoskimmer, Crystal Keeper, Edgewatch Detective, Oozemorph, Pirate, Pistol Phenom, Swarmkeeper archetypes
-   (Rigo) Correct Spell Reservoir's Channeled Release action glyph
-   (Rigo) Correct Thousand Pains Fulu usage
-   (Rigo) Correct usage and description of Silver Salve
-   (Rigo) Fix Inflammation Flask description and publication data
-   (Rigo) Remove class predicate from Parallel Breakthrough
-   (Rigo) Remove Conjure Bullet grant from Spellshot Dedication
-   (Rigo) Update Distracting Explosion and Electrify Armor unstable DC to 15
-   (Rigo) Update Worm's Repast inline damage links
-   (Rigo) Use AdjustModifier in Investigator Expertise to upgrade Pursue a Lead bonus
-   (stwlam) Fix damage type and kinds of Field of Life spell
-   (stwlam) Fix predicate and value of RE on Effect: Emblazon Energy
-   (Tikael) Add automation to Firearm Expert
-   (Tikael) Add content from Curtain Call Player's Guide
-   (Tikael) Fix abilities on The Librarian and variant
-   (Tikael) Fix rule elements on Nephilim Lore and Powder Punch Stance effect
-   (Tikael) Fix several creatures with missing spellcasting DCs
-   (Tikael) Fix the case of several feats
-   (Tikael) Update backgrounds to use Remaster terminology
-   (TMun) Add Quest 19 NPCs
-   (Trent) Add choiceset rules to Intense Implement feat

### Under the Hood

-   (In3luki) Add custom `tagify-tags` HTML element that handles `Tagify` form data
-   (MrVauxs) Add item and origin to appliedDamage messages
-   (stwlam) Allow `target`s of `TokenPF2e#distanceTo` to be arbitrary points

## 6.0.4

### Bugfixes

-   (stwlam) Fix rendering of invisible creatures when see-invisibility detection mode is in use
-   (stwlam) Add temporary measure to fix abilities that function similarly to the Keen weapon property rune
-   (stwlam) Update actor/item hiding from creation dialog windows for V12 (sorry about the book-item tease)
-   (stwlam) Prevent AE-like rule elements from sometimes catastrophically exploding on very old actors

## 6.0.3

### System Improvements

-   (jfn4th) Control rule element viewing permissions using foundry user role
-   (Vauxs) Copy all homebrew feat traits to effect traits

### Bugfixes

-   (Supe) Fix sheets not opening in certain instances involving bad inventory data.
-   (Supe) Fix the current scene sync darkness option becoming unlocalized when the world sync setting is changed.

### Data Updates

-   (Dire Weasel) Add automation and links for Howl of the Wild's Ankhrav Duster, Hive Mother Bottle, and Sargassum Phial
-   (kromko) Add minor fixes for Venomtail Kobold

## 6.0.2

### System Improvements

-   (MrVauxs) Add additional damage from venomous trait
-   (Supe) Undo restriction for variant grid diagonals such as 5 foot diagonals. This has no impact on templates.

### Bugfixes

-   (In3luki) Fix auras not being drawn when a token is created
-   (Rigo) Fix localization for token light rule element form
-   (stwlam) Fix NPC strikes with the thrown trait not being detected as ranged attacks
-   (stwlam) Fix darkness regions not hiding tokens from players without darkvision
-   (stwlam) Fix reinforced stock not benefitting from the two hand trait when the weapon is held with both hands
-   (Supe) Fix creating roll tables from compendium results
-   (Supe) Fix overriding striking dice using the Striking Rule Element, used in some effects such as Runic Weapon.
-   (Supe) Fix the "Give" button sometimes showing to players when purchasing an item
-   (Supe) Fix label for damage type overrides in the damage roll dialog
-   (Supe) Fixed the Token Image Rule Element form
-   (Supe) Fix markdown rendering for item alteration description overrides
-   (Supe) Prevent sheet crashes from invalid skills data

### Data Updates

-   (Abaddon) Fix errors in relic action descriptions
-   (Abaddon) Fix broken spell link in Mahathallah
-   (Ambrose M) Add missing grab ability to Unrisen (BotD) and Shisagishin (SoG)
-   (Ambrose M) Correct Flame Attack for Fire Giant
-   (Dire Weasel) Add ancestry feature items to Centaur
-   (Dire Weasel) Add inline buttons to Summon Warden of the Wild
-   (Dire Weasel) Add spell effect for Hippocampus Retreat
-   (Dire Weasel) Add Surki language
-   (Dire Weasel) Add automation to Mocking Chorus, Prismhydra, Stargut Hydra, and Tyrafdir
-   (kromko) Fix formatting issues in some Howl of the Wild feats
-   (stwlam) Update internal macros, journal entries, and roll tables to V12 schema
-   (Tikael) Add inline check to the Thaumaturge's Ring Bell action

## 6.0.1

This release requires Foundry VTT version 12.327

### Highlights

-   (TangledLion) Add new icon for Serum of Sex Shift

### System Improvements

-   (stwlam) Add support for drag/drop repositioning of regions
-   (stwlam) Add "axes" as a resistance type
-   (Supe) Add ability for GMs to gift items from merchants to players for free

### Bugfixes

-   (In3luki) Make pf2e specific prosemirror menu options available in journal sheets
-   (In3luki) Fix scene config terrain updates with blank inputs
-   (In3luki) Fix vision mode initialization before the canvas is ready
-   (In3luki) Update Token Config with changes from the latest core version
-   (In3luki) Show roll mode indicator for damage rolls
-   (Maple) Hide non-functional UI elements when editing non-stowing containers
-   (stwlam) Fix certain errors that sometimes occured with npc melee item traits
-   (stwlam) Fix UUIDs for older migrations and module art
-   (Supe) Fix errors with skill migrations from 6.0.0 beta 3.
-   (Supe) Fix Kingmaker settlements and update to Prosemirror
-   (Supe) Fix text issues in treat wounds and identify item
-   (Supe) Fix rendering of invested items within non-stowing containers

### Data Updates

-   (Ambrose M) Improve automation for Fire Shield
-   (Dire Weasel) Add campaign effect for Stoop
-   (Dire Weasel) Update automation for Howl of the Wild automation
-   (DocSchlock) Add max badge value to Multilating Bite
-   (DocSchlock) Update more skill ability scores to attribute modifiers for remaster
-   (DocSchlock) Fixes for Season of Ghosts major story npc
-   (Rigo) Add damage button to Thermal Nimbus
-   (Rigo) Fix the second Clan Lore skill
-   (Rigo) Move certain impulse junctions to feat description alterations
-   (SpartanCPA) Minor fixes to Trample and Corrupting Gaze
-   (stwlam) Fix malformed source uuids for wands held by certain NPCs
-   (Tikael) Add Howl of the Wild barbarian instincts
-   (Tikael) Fix automation of Awakened Animal and Swimming Animal heritage

### Under the Hood

-   (stwlam) Skip excluding creature traits for NPC strikes generated from rule elements
-   (Supe) Make the Strike rule's "ability" property into a resolvable

## 6.0.0 Beta 3

This release includes all data from system release 5.16.1 and requires Foundry VTT version 12.323. Several major under the hood changes have been made that would benefit from testing.

### System Improvements

-   (Abaddon) Localize physical item attach button label
-   (In3luki) Add support for scene environment types as well as scene environment region overrides
-   (Supe) Add button to view item specific roll options in the item rules tab

### Bugfixes

-   (In3luki) Fix grant item form erroring when resolvables fail
-   (MrVauxs) Add support for eidolon gang up flanking
-   (stwlam) Fix updating deity sanctification
-   (stwlam) Remove Z key token cycling now that a similar feature exists in FoundryVTT
-   (Supe) Allow class traits to be added to ability items
-   (Supe) Fix display of upgrade dice in roll inspector
-   (Supe) Fix resolution and updates of mergeable toggleable roll option dropdowns

### Data Updates

-   (Abaddon) Fix prerequites of certain feats
-   (Ambrose M) Fix and update Glass Shield and Fire Shield
-   (Dire Weasel) Add effect for Mind of Menace
-   (Dire Weasel) Update effect for Distracting Decoy and Shielding Wave
-   (Dire Weasel) Update Cry of Destruction and Chilling Darkness
-   (Dire Weasel) Fixes for Falling Portcullis and Rusted Door traps
-   (Rigo) Move impulse junction notes to feat description alterations
-   (rectulo) Fix malformed html in reveal hidden self
-   (stwlam) Fix source id for Padli's Wand of Magic Missile

### Under the Hood

-   (In3luki) Fix multiple errors caused by various uuid testing functions
-   (stwlam) Convert npc attacks and kit items to foundry data models
-   (Supe) Finish converting all short form skill abbreviations (ath) to skill slugs (athletics)
-   (Supe) Add roll options for item and feat action type and cost

## 6.0.0 Beta 2

This release requires Foundry VTT version 12.323

### System Improvements

-   (In3luki) Compact prosemirror to avoid wrapping in several locations
-   (In3luki) Style pf2e custom elements in prosemirror editor
-   (Supe) Use Prosemirror in character biographies, hazard sheet, npc sheet, and simple npc sheet

### Bugfixes

-   (Idle) Fix dropdown in Token Light RE form
-   (In3luki) Fix visibility of hidden, undetected, and unnoticed tokens
-   (In3luki) Fix melee weapons gaining a range
-   (In3luki) Fix new actors being assigned the wrong prototype token image
-   (In3luki) Fix rolling deterministic damage such as splash
-   (stwlam) Fix importing actors and items from module compendia

## 6.0.0 Beta 1

### New Features

-   (In3luki, stwlam, Supe) Add support for Foundry VTT version 12

### System Improvements

-   (In3luki) Switched text editor to prosemirror for item sheets
-   (Supe) Tweaked token config to better represent modifications from Rules Based Vision
-   (Supe) Reduced Rules Based Vision's brightness value to default foundry values for darkvision.

### Bugfixes

-   (Supe) Rerender token vision when global RBV setting is changed
