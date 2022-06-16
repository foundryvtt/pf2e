# Changelog

## Version 3.11.2

### New Features
* (Supe) Add a roll inspection dialog, accessible from chat message context menu (currently supports check rolls)

### Core System Improvements
* (Supe) Show when the beta hazard sheet is in edit mode in the application titlebar, display source and author

### Bugfixes
* (stwlam) Restore legacy support for RE predication checking "attack" trait (affected Draconic Rage, among other abilities)
* (stwlam) Fix localization of spell traditions in chat cards
* (stwlam) Fix players not being able to see save DCs from their own spells
* (stwlam) Include modifier adjustments and roll substitutions in action macros
* (stwlam) Fix issue causing modifier adjustments to not be included on manually-added modifiers
* (stwlam) Remove reference to non-existent success note for corrosive rune
* (stwlam) Fix issue causing container contents to disappear when the container is deleted

### Data Updates
* (avagdu) Audit NPCs in Fall of Plaguestone compendium
* (Manni) Localize persistent damage notes in several NPCs
* (Manni) Review Bestary 2: Changed name of magic weapon to base weapon
* (Manni) Fix HP details field of Ice Mephit and Yamaraj
* (NullWolf) Add missing Peachwood equipment
* (NullWolf) Fix rule element in Effect: Boost Eidolon
* (Shandyan) Add rule elements to human feats
* (stwlam) Fix description and rune on Victory Plate (Greater)
* (stwlam) Fix flag name for ChoiceSet in Effect: Alchemical Strike
* (stwlam) Make corrections to Elephant Form effect, link from spell description
* (TMun) Add complex hazards from Book of the Dead


## Version 3.11.1

### Bugfixes
* (stwlam) Fix failed import of repair action macro
* (stwlam) Restore functionality of several damage-related weapon traits
* (Supe) Handle aberrant price values on items
* (Supe) Show strike descriptions in new hazard sheet

### Data Updates
* (Manni) Changed name of magic weapons on several Bestiary 2 creatures to base weapon names


## Version 3.11.0

#### New Features
* (stwlam) Add support for throwing melee weapons with Thrown trait--currently the weapon isn't lost when thrown, pending accounting of mitigating abilities
* (stwlam) Add secret feature allowing one to generate [redacted] from [redacted] on NPCs
* (Supe) Add syntax highlighter and linter for Rule Element editing
* (Supe) Add new (in-testing) Hazard sheet

### Core System Improvements
* (Anathema) Rework readme for official status and license info
* (Friz) Add logic to grey Inventory, Effect and Notes tabs for NPC if relative tab is empty
* (JDCalvert) Make the AdjustStrike rule element replace existing traits of the same type and lower value
* (nikolaj-a) Add Repair and Treat Disease action macros
* (stwlam) Allow searching for any physical item trait in equipment browser: will expand to other browser tabs in future release
* (stwlam) Add support for die faces downgrade in Damage Dice rule element
* (stwlam) Strictly separate action and weapon traits in strike roll cards
* (stwlam) Preserve search text when resetting filters in compendium browser
* (Supe) Add support for containers on all actor types with inventories (all except familiars)
* (Supe) Report offending item when rule element fails to build
* (kolontaev) Add additive modifier to the recovery rate from a night's rest

### Bugfixes
* (kolontaev) Fix bug causing check dialog to reset its roll-twice option under some circumstances
* (stwlam) Fix Rest for the Night procedure inadvertantly saving prepared PC data and causing various adverse effects
* (stwlam) Fix issue causing archetypes granting weapon proficiencies to interfere with some weapon damage effects (e.g., Archer Dedication and Gravity Weapon)
* (stwlam) Fix issue causing unlinked tokens to not re-render when receiving a token-light effect
* (stwlam) Prevent spell data from being wiped on item permission updates

### Data Updates
* (Arthana) Add traits for feat & actions chat cards
* (Dana) Add Student of the Staff automation
* (InfamousSky) Add icons to Guns and Gears and Knights of Lastwall spells/equipment
* (InfamousSky) Review FotRP book 2 chapters 2 & 3 and toolbox
* (Abaddon) Review AoA scarlet triad agent
* (Abaddon) Review B2 raven, raven swarm
* (avagdu) Make corrections for omblin leadbuster, brimstone rat, and bugbear marauder
* (kageru) Fix typo in shadows at sundown bestiary
* (kolontaev) Unify style of Critical Hit/Fumble Deck
* (rectulo) Fix a typo in the Clay Golem's Vulnerable to Disintegrate ability
* (rectulo) Fix Bottled Sunlight minimum damage
* (rectulo) Update the format of the Vortex pull ability of the Ancient bronze dragon (spellcaster)
* (Roxim) Add Black Cat Curse effect and tweak a few EC NPCs
* (Roxim) Brushup Extinction Curse Book 3 NPCs
* (Shandyan) Adding macro links to Grippli feats
* (Shandyan) Automate Goblin, Half-Elf, Half-Orc, Halfling, and Hobgoblin feats
* (Simone Miraglia) Process ChoiceSets' predicates injected properties
* (SoldierC4) Add poison resistance to Oracle of Bones curse
* (SpartanCPA) Add effects for Energy Mutagen
* (SpartanCPA) Brush up some AV hazards
* (SpartanCPA) Add Peachwood Talisman
* (SpartanCPA) Add Knockdown ability to Jaul's Wolf
* (SpartanCPA) Add an effect for Methodical Debilitations
* (SpartanCPA) Add automation to the Gloom Blade
* (SpartanCPA) Add rules to Draconic Momentum
* (SpartanCPA) Audit Forest and Sea Dragons
* (SpartanCPA) Audit Ralldar (Age of Ashes)
* (SpartanCPA) Correct the Alignment of Soul Eater
* (SpartanCPA) Harmonize formatting of all Alchemical Golems
* (SpartanCPA) Remove NPCs from Age of Ashes compendium that are republished in Core/Lost Omens lines
* (SpartanCPA) Update heightening effect of Day's Weight spell
* (stwlam) Add/update some weapon icons
* (stwlam) Add inline roll to Devil's Keep boon
* (stwlam) Automatically resolve Boost Eidolon damage bonus
* (stwlam) Consolidate Scholar backgrounds into single item, remove no-longer-referenced Assurance feats
* (stwlam) Correct spellcasting tradition and ability of Sajan's focus spells
* (stwlam) Fix rule-element predication on Disrupting Weapons spell effect
* (stwlam) Fix spelling of Metronomic Hammer and Gravelands Herbalist
* (stwlam) Have Animal Instinct unarmed strikes require Rage effect
* (stwlam) Require weapon with reload 0 for double-shot/triple-shot
* (stwlam) Set expert deity's weapon proficiency in correct warpriest doctrine
* (TMun) Add missing Ghost ability Fade
* (TMun) Correct Ghost Charge rule element
* (TMun) Correct Saddleback Bunyip Size
* (TMun) Add/update NPCS in PFS 1-19, 1-22, 1-23, 2-14, 2-15, 2-18, 2-20, and 2-22


## Version 3.10.4

### Bugfixes
* (JDCalvert) Generate weapon names for striking weapons with no potency rune
* (Supe) Prevent unintended item updates (and possible resets) in rule-element editor
* (stwlam) Fix effect expiration triggered by Roll Twice rule elements
* (stwlam) Fix bug preventing suppression of circumstance penalties by True Strike effect

### Data Updates
* (Abaddon) Review Bebilith, Intellect Devourer, Jyoti, Moonflower
* (Friz) Add missing inline automation to Caterwaul Sling
* (Friz) Added missing traits to Dinosaur Boots
* (Friz) Fix details of Sulfur Bomb failure effect
* (Friz) Fixed consumable type of multiple Feather Tokens
* (kageru) Fix malformed roll expressions in pfs-3 bestiary
* (Koncookie) Fix ability modifiers of multiple creatures
* (LebombJames) Add reload time to Shobhad Longrifle
* (Manni) Fix details on Thanadaemon and Stygira
* (Manni) Remove duplicate Negative Healing ability from Giant Crawling Hand
* (Pliskin) Fix the size of the Sicklehand Construct
* (rectulo) Fix a typos in action descriptions of Quasit and Shining Child (Bestiary 1)
* (Redeux) Added area to Flame Strike
* (Shandyan) Automate Goloma ancestry feats
* (Shandyan) Automate goblin feats, part 1
* (SpartanCPA) Add rollable Flat Check button in Confused condition
* (SpartanCPA) Standardize Construct Armor implementation
* (SpartanCPA, Tikael) Add new items from Lost Omens: Knights of Lastwall
* (stwlam) Add rule elements to set Warpriest armor proficiencies at level 13
* (stwlam) Fix rule elements on Boastful Hunter
* (stwlam) Link Magic Fang spell effect from spell description, update icon
* (stwlam) Remove ability to strike while in pest form
* (Tikael) Add more vampire family abilities
* (Tikael) Fix construct armor rule elements
* (Tikael) Localize rule elements on Sterling Dynamo Dedication
* (Tikael) Grant Champion's reactions for each Cause class feature
* (TMun) Add/update NPCs from PFS scenarios 3-05, 3-06, 3-07, 3-08, 3-09, 3-11, 3-12, 3-13, 3-14
* (TMun) Add effect area to Storm of Vengeance
* (TMun) Add spell-heightening data to Subconscious Suggestion
* (TMun) Convert Ice Storm to new spell format
* (TMun) Convert Planetar Sword into current data entry standard and add missing change shape ability
* (TMun) Fix details of Hydraulic Torrent spell
* (TMun) Fix Golem Anti-Magic description for Lazurite-Infused Stone Golem
* (TMun) Set perception to +8 per private note on Ninth Army Ruffian
* (Vindico) Add archetype journals for several Book of the Dead archetypes


## Version 3.10.3

### Bugfixes
* (stwlam) Fix bug causing some deferred statistics (e.g., strike damage while in battle form) from resolving incorrectly
* (stwlam) Fix functionality of damage buttons on attack roll messages from a combination weapon's melee usage
* (stwlam) Fix effect-area link repost buttons
* (stwlam) Roll initiative privately for hidden combatants
* (Supe) Restore reagents when resting for the night
* (Supe) Maintain spellcasting preparation dialog scroll position when adding spells

### Data Updates
* (Abaddon) Fix Skeleton Guard weapons
* (Friz) Update critical specialization for Bow to add immobilized drag text
* (InfamousSky) Add icons to tools and accessories from Guns & Gears
* (InfamousSky) Review Fist of the Ruby Phoenix book 2 chapter 2
* (JDCalvert) Add rule elements to Mauler and Archer dedication feats
* (Kuroni Kobayakawa) Fix formatting errors on a handful of item descriptions
* (Manni) Corrected senses of Mastodon (Bestiary 2)
* (Manni) Updated Void Zombie to the correct notation for Salt Water weakness
* (NullWolf) Add Heroism to Choral spells
* (NullWolf) Set Inhaled as a weapon trait and add Traits to Vexing Vapor
* (NullWolf) Update Troubles in Otari Hazards
* (rectulo) Corrects a typo in sea serpent undetectable ability
* (rectulo) Fix a typo in the draconic frenzy ability of the young white dragon
* (Shandyan) Automate gnome feats
* (SpartanCPA) Add bonus to saves vs Shove and Trip to Mountain Stance effect
* (stwlam) Run extractPacks all on every compendium except PFS bestiaries
* (Tikael) Remove generic Sneak Attack rules from PFS creatures
* (Tikael) Remove inline precision damage buttons and duplicate flat footed references
* (Tikael) Update Raise a Shield action on Beginner Box pregens


## Version 3.10.2

### Bugfixes
* (Cerapter) Fix reagent number reacting to formula quantity adjustments, make quantity adjustments more responsive
* (stwlam) Fix display of attack roll modifiers on PC sheets when Devise a Stratagem is enabled
* (stwlam) Fix temporary-item deletion in Rest for the Night macro
* (stwlam) Fix issue causing @Check prompts sent to chat to not display proper DC
* (stwlam) Hide price of unidentified items on loot actor sheets
* (stwlam) Fix setting of purchase price when buying from merchants
* (Supe) Fix migration of Acid Splash spell damage

### Data Updates
* (Abaddon) Update Cornugon (Bestiary 2)
* (Delzoun) Add automation to most ancestry weapon expertise feats
* (InfamousSky) Add icons to all SoM items, several Guns & Gears items
* (Kuroni Kobayakawa) Fix formatting errors on a handful of feat descriptions
* (SpartanCPA) Make a few magical staves into weapon items
* (SpartanCPA) Localize Persistent Bleed d4-d8 (Part 1)
* (SpartanCPA) Make corrections to Boots of Dancing
* (stwlam) Add appropriate predicates to Animal Skin feat REs
* (TMun) Add/update NPCs from PFS 2-10, PFS 2-11, PFS 2-17, PFS 2-13, PFS 3-04
* (TMun) Add sources and missing states to actions
* (TMun) Add missing GMG subsystem actions


## Version 3.10.1

### Bugfixes
* (JDCalvert) Fix parsing of die size on NPC attacks with the Deadly trait
* (stwlam) Fix issue causing incorrect degree of success to be reported with substituted rolls (e.g., Assurance)
* (stwlam) Fix issue causing infused reagents remaining to not be changeable
* (Supe) Fix updating weapon price
* (Supe) Fix taking and purchasing items from third party compendiums

### Data Updates
* (NullWolf) Update NPCs from Troubles in Otari and add Hypnotic Stare Bestiary Effect
* (SpartanCPA) Localize Persistent Poison notes
* (stwlam) Fix CHA penalty on stupefied condition


## Version 3.10.0

### New Features
* (stwlam) Add new "Roll Twice" and "Substitute Roll" rule elements, implementing effects like True Spike and Assurance, respectively
* (stwlam) Register a keybinding to cycle a mouse-hovered token stack
* (Supe) Implement fixed level spell heightening (e.g., Acid Splash)

### Core System Improvements
* (In3luki) Improve Compendium Browser filters
* (In3luki) Support PF2e inline links in all chat messages
* (nikolaj-a) Add flag to suppress damage buttons on chat cards
* (stwlam) Add ability to set an NPC's alliance, appropriate token disposition property for visual display
* (stwlam) Retire Effect Target rule element, with Choice Set taking over its features
* (Supe) Add edit button to rule elements for pretty printed JSON editing
* (Supe) Add support for batch pricing such as for arrows
* (Supe) Move spell preparation to separate application window
* (Supe) Show coinage and total wealth for NPC and Loot sheets
* (Tikael) Add (name)-inline-dc as a selector for inline check DCs

### Bugfixes
* (Supe) Always show spontaneous spell levels that have at least one non-signature spell
* (Supe) Hide mystified items in total wealth calculations for players
* (Supe) Persist crafting known formula quantities across sheet updates
* (Supe) Show cost for entire batch in crafting tab
* (stwlam) Send NPC death notes out only once
* (stwlam) Fix functionality of deadly trait on battle-form attacks
* (Vyklade) Maintain backwards compatibility for actor.toggleRollOption()

### Data Updates
* (Abaddon) Review AV3 bestiary
* (Delzoun) Add Automation for Elemental Heart and OathKeeper dwarf heritages
* (Delzoun) Add proficiency increase with Clan Pistol Feat
* (Delzoun) Add an effect for the Heroes' Call Feat
* (Gronex) Add check-dialog handling for backswing and sweep weapon traits
* (InfamousSky) Add fixed level spell heightening data
* (InfamousSky) Add several spell icons, Repeating Cross, Grim Sandglass
* (InfamousSky) Review FotRP book 2 chapters 1 & 2
* (JDCalvert) Fix Double-Barreled Musket's name and trait description
* (JDCalvert) Grant Juggle feat with Juggler Dedication
* (JDCalvert) Fix capacity traits on Pepperbox and Slide Pistol
* (kageru) Fix typos in several item descriptions
* (nikolaj-a) Add Command an Animal, Sense Direction, and Track action macros
* (NullWolf) Add Unarmored proficiency increase to Animal Skin feat
* (putty) Fix candle and chalk prices by using charges instead of quantity
* (redeux) Add actors from PFS 3-12
* (Shandyan) Add description to Skeleton ancestry
* (Shandyan) Automate Conrasu, Elf, Fetchling, Fleshwarp, and Ganzi feats and heritages
* (Shandyan) Correct Catfolk Lore skill
* (silvative) Add Wasul Reed Mask from AV Adventure Toolbox to equipment compendium
* (SoldierC4) Add more NPC death notes
* (SoldierC4) Add hazards and make QA pass on Book of the Dead
* (SpartanCPA) Add BattleForms to Rampaging Form
* (SpartanCPA) Add FlatModifier and Icon to Fleshwarp "Unusual Anatomy" Feature
* (SpartanCPA) Add initiative REs to Norns
* (SpartanCPA) Add Resistances to "Sky and Heaven Stance"
* (SpartanCPA) Add real equipment to NPC from PFS 1-01 through 1-04
* (SpartanCPA) Add spell icons for spells C-G
* (SpartanCPA) Correct name of Groetan Candle
* (SpartanCPA) Add Circus Actions (Extinction Curse)
* (SpartanCPA) Fix Drunken Brawler NPC
* (SpartanCPA) Fix typo in Acid Arrow description
* (SpartanCPA) Normalize formatting of NPC damage weaknesses/resistances
* (SpartanCPA) Run Sneak Attack Tweaks on AV and extractPacks formatting
* (SpartanCPA) Standardize notes for missing DCs
* (SpartanCPA) Update Sneak Attack rule elements
* (stwlam) Add Skeleton trait to Skeleton ancestry feats
* (stwlam) Add rule elements to Wrestler Dedication
* (stwlam) Prune redundant Assurance feats with no other compendium references
* (stwlam) Sort localized sheet tags
* (telekenunes) Add Automation for the Martial Experience Feat
* (telekenunes) Added Energize Wings effect
* (TMun) Correct heightening on Hallowed Ground spell
* (TMun) Correct text for voidworm Confounding Lash ability
* (TMun) Update OGL license text to present release
* (TMun) Update or add PFS 1-18, 1-24, 2-06, 2-07, 2-09, 3-10, 3-15 NPCs
* (TMun) Add influence subsystem actions
* (Tikael) Add effects for Shield Ally, Faerie Dust spell, Fortune/Misfortune NPC abilities
* (Tikael) Automate Dragonslayer's Shield
* (Tikael) Fix linking in Flames Oracle Mystery
* (Tikael) Fix source of Dragon's Blood Pudding
* (Tikael) Fix spells of scarlet triad mage
* (Tikael) Mark some bestiary glossary abilities as death notes.
* (Tikael) Remove all gm visibility tags from compendiums and en.json
* (Tikael) Remove origin from predicates of DC improving feats
* (VestOfHolding) Adding Evolution Feat choice and note about link cantrips.


## Version 3.9.2

### Data Updates
* (InfamousSky) Brush up FotRP book 1 toolbox, continued
* (InfamousSky) Brush up FotRP book 2, chapter 1
* (Shandyan) Automate several dwarf ancestry feats
* (SpartanCPA) Add Book of the Dead NPCs
* (Tikael) Add new traits and localizations for Book of the Dead NPCs
* (Tikael) Add Cloud Dragon to the choices for Dragon Disciple


## Version 3.9.1

### New Features
* (Cerapter) Allow equipment to be purchased directly from compendium browser

### Core System Improvements
* (Telekenunes) Add more versatile traits
* (Tikael) Add armor and weapon proficiencies to roll options, automate proficiency feats
* (Vyklade) expand `SpellPF2e#rollAttack()` method to allow more arguments to be passed from macros

### Bugfixes
* (stwlam) Fix draggable roll option toggles from PC sheet
* (stwlam) Add brawling group to basic unarmed strike
* (stwlam) Clean up and localize item identification
* (stwlam) Hide strike damage roll buttons on chat cards if the user can't roll them

### Data Updates
* (Abaddon) Brush up Belcorra from AV book 3
* (Benyar, Doc Burns, Soldier C4, SpartanCPA, Tikael) Add BotD PC options
* (InfamousSky) Review FotRP book 1 toolbox
* (InfamousSky, Tikael) Add _Punks in a Powderkeg_ content
* (rectulo) Fix the Breach ability of the megalodon
* (Shandyan) Automate Dhampir and Duskwalker feats
* (SpartanCPA) Add Book of the Dead Creature Abilities
* (stwlam) Fix name of Janatimo's Lessons feat


## Version 3.9.0

### Core System Improvements
* (In3luki) Sort core skills on the character sheet by localized label
* (nikolaj-a) Add Avoid Notice, Arcane Slam, and Treat Poison action macros
* (nikolaj-a) Add tooltip with trait description in action macro chat cards
* (nikolaj-a) Allow Rest for the Night to work with multiple actors
* (SoldierC4) Add means of sending NPC "death effect" messages to chat
* (Supe) Allow swapping prepared spells without first needing to clear them
* (Supe) Add more responsive drag and drop behavior for spellcasting entries
* (stwlam) Add a TokenName rule element

### Bugfixes
* (Friz) Fix issue causing Unstable trait description to not appear on mouse hover
* (Friz) Fix styling quirks for action summaries on PC/NPC actions
* (In3luki) Fix measured template preview remaining on the canvas after cancelling the placement
* (JDCalvert) Only show ammunition selection box if weapon requires ammunition
* (stwlam) Fix battleform RE not checking if caster's own unarmed attack bonus is better than the form's
* (stwlam) Fix aberrant behavior when editing PFS player/character numbers
* (stwlam) Fix issue causing some effects to not modify AC on PC actors
* (Supe) Make it easier to drop feats into campaign feats section
* (Supe) Fix dragging from another sheet into campaign feats moving all campaign feats into bonus feats
* (Supe) Fix character alignment bleeding into the portrait on Firefox
* (Supe) Fix styling of item-sheet and compendium-browser scrollbars on Firefox
* (Supe) Set granted item's sourceId to its uuid so re-evaluation works for imported world items
* (Tikael) Fix visbility of elements in journals
* (Tikael) Fix the level of the Greater Hauling rune

### Data Updates
* (Abaddon) Add missing hazards for Beginner Box, unify actor names in the compendium
* (Abaddon) Brushup AV book 1, chapters 2 & 3
* (Abaddon) Fix Seelah's weapons
* (Arthana) Allow Recovery Checks DC to be set by AE-likes instead of hardcoded feats
* (cepvep) Fix action cost on Tooth Fairy
* (Cora) Add TokenLight rule element for hooded lantern
* (Delzoun) Added Spell Effect for Ant Haul
* (Delzoun) Added inline roll to Cataclyism, Goodberry, and Scorching Ray
* (Friz) Add reflex save button to explode action based on classDC
* (Friz) Brush up Yaganty (Extinction Curse bestiary)
* (Friz) Fix text on various Inventor actions/feats
* (Friz) Fix usage of Miter of Communion item
* (Friz) Replace spell effect links for ooze form with shorter versions
* (In3luki) Add bonus type to Dangerous Sorcery bonus damage
* (InfamousSky) Clean up FotRP actors book 1, chapters 2 & 3
* (JDCalvert) Improve toggles when multiple Hunt Pray abilities are acquired
* (LebombJames) Added compendium links to various spells
* (LebombJames) Corrected Roaring Applause duration to be sustained
* (LebombJames) Corrected prerequisite of Captivating Intensity
* (NullWolf) Correct Usage for Genius Diadem
* (rectulo) Removed Telepathy from Street Skelm
* (Roxim) Brushup EC book 2 NPCs
* (Shandyan) Add effects and add rule elements for aasimar, android, aphorite, beastkin, and automaton ancestry feats
* (Shandyan) Add inline checks and effect links to android and aphorite feats
* (SpartanCPA) Assign icon to Kusarigama
* (SpartanCPA) Fix the em tags on Whip of Compliance
* (SpartanCPA) Minor Fixes to EC2 NPCs
* (SpartanCPA) Remove Negative Healing from the Beginner Box Zombie
* (SpartanCPA) Show Dread Marshall Stance effect on token
* (stwlam) Add Druidic language from Druidic Language class feature
* (stwlam) Fix predicate on Inured to Alchemy
* (TMun) Correct healing font for BB Kyra and fix prepared spell lists for BB casters
* (Tikael) Add "Other" usage and apply it to Walking Cauldron
* (Tikael) Add AdjustDegreeOfSuccess RE to Adroit Manipulation
* (Tikael) Add ChoiceSet REs to Virtuosic Performer and Saloon Entertainer
* (Tikael) Add rule elements to Torch item
* (Tikael) Add the changes from the APG second printing
* (Tikael) Automate Physical Training feat
* (Tikael) Automate Skill Training feat
* (Tikael) Automate Sparkling Targe
* (Tikael) Brushup Dragon Disciple Dedication and Scales of the Dragon
* (Tikael) Cleanup previously done April data entry
* (Tikael) Fix Battle Oracle armor proficiencies
* (Tikael) Fix item grant in Idyllkin
* (Tikael) Fix rule elements on Resounding Bravery Effect
* (Tikael) Fix several non-functional inline checks
* (Tikael) Give Automaton a choice of creature size
* (Tikael) Make BB kobold sneak attack match text exactly.
* (Tikael) Set variable action feats to show the minimum number of actions
* (Tikael) Standardize rogue debilitation note visibility
* (Vindico) Automated Death Warden Dwarf heritage


## Version 3.8.4

### Core System Improvements
* (stwlam) Have tiny crafters craft tiny items during daily preparation
* (Supe) Expose best spell dc for characters in attributes as @actor.attributes.spellDC.value

### Data Updates
* (Abaddon) Fix various typos in Bestiary 1
* (Abaddon) Unify incorporeal resistance exceptions
* (InfamousSky) Audit Fists of the Ruby Phoenix actors (book 1, chapter 1)
* (NullWolf) Add Puff Dragon item from Guns and Gears
* (NullWolf) Correct inline save for Necklace of Fireballs
* (NullWolf) Correct typos in Wyrmblessed effects
* (NullWolf) Fix modifier type for Observant Halfling.
* (NullWolf) Grant Protector's Interdiction action with Protective Spirit Mask feat
* (SoldierC4) Fill in missing sources for heritages and Shadows of the Ancients equipment
* (SoldierC4) Correct Dragon Breath sources and feat rarities
* (SoldierC4) Grant Arcane Cascade action with feat
* (SpartanCPA) Add icons to spells lacking unique ones (A-B)
* (SpartanCPA) Widen the line template of the Wand of Crackling Lightning
* (TMun) Convert Lightning Storm to Saving Throw
* (TMun) Update the Stabbing Beast stat block
* (TikaelSol) Automate Sealed Poppet feat
* (TikaelSol) Resolve the value of TokenImage REs
* (rectulo) Fix the Drained effect in Violet Venom
* (stwlam) Remove Laughing Shadow toggle and fully automate
* (stwlam) Remove coins from kits


## Version 3.8.3

### Bugfixes
* (stwlam) Check that there is at least one circumstance penalty/bonus before deciding an AC is adjusted
* (stwlam) Fix issue preventing some damage dice overrides from being applied
* (Supe) Fix lore checks to use intelligence
* (Supe) Show unlimited uses for innate cantrips

## Version 3.8.2

### Bugfixes
* (stwlam) Override core ClientDocument#link getter for items to fix compendium link generation
* (Supe) Fix sheet errors on refresh while a crafting tab item summary is expanded

### Data Updates
* (Abaddon) Refresh lifesense ability from Bestiary 1's Nosoi
* (Adisander) Fix HP and token images of some iconics
* (Drental) Update rule elements on gourd leshy and observant halfling
* (Drental) Correct typo in hunter automaton rule elements
* (NullWolf) Correct description of Unbreakable Bond feat
* (NullWolf) Add property Stonestep Shisk heritage
* (NullWolf) Add missing archetype journal entries from Secrets of Magic
* (Roxim) Brushup Exinction Curse Book 1 Appendix NPCs
* (SoldierC4) Correct sources, levels, prices, and rarities of several equipment items
* (SpartanCPA) Make several corrections among new PFS creatures
* (stwlam) Fix reload property of peshpine grenades
* (stwlam) Update Wild Morph spell effect
* (Tikael) Correct bonus type for Dual-Handed Assault
* (Tikael) Fix rule elements on Warrior Automaton heritage
* (Tikael) Automate Twisting Tree hybrid study

## Version 3.8.1

### Bugfixes
* (stwlam) Fix rendering of exploration and downtime actions on PC sheet
* (stwlam) Prevent rule-element-based unarmed strikes from being renamed by handwraps runes
* (stwlam) Migrate ToggleProperty rule elements with the older key naming schema ("PF2E.RuleElement.ToggleProperty")

### Data Updates
* (SoldierC4) Add data for 2-action cast to Harm
* (Tikael) Add a Strike rule element to the Arcane Fist feat
* (Tikael) Fix save type of Force Cage spell


## Version 3.8.0

### New Features
* (stwlam) Add deities as items, begin integrating them with system automation: players running champions and clerics may want to drop new classes onto their sheets.
* (Supe) Implement innate-spell usage tracking

### Core System Improvements
* (stwlam) Show limited-permissions NPCs with actor links in the actor directory
* (stwlam) Automate jousting trait (simplified to requiring a lance to be held in one hand)
* (stwlam) Retire ToggleProperty rule element in favor of toggleable RollOptions
* (stwlam) Accommodate Babele module's need for specific timing of condition manager's initialization
* (stwlam) Add setting to disable flanking automation
* (Supe) Remove doomed pips from character sheet, users should use conditions instead
* (Supe) Make NPC spellcasting entry title editable
* (Supe) Add optional campaign feats section, support drag/drop on campaign/bonus feats title
* (Vyklade) Add ability to specify from a macro that a roll should be made twice, keeping the higher or lower of the two

### Bugfixes
* (Brault) Process changes made to token HP values as damage application
* (Cerapter) Fix action macros skipping weapon traits that impose penalties
* (stwlam) Fix nameless export of themed pf2e journal sheet
* (stwlam) Fix rendering of vehicle-sheet actions tab
* (stwlam) Ignore token scale in TokenPF2e#distanceTo
* (stwlam) Clean up PFS tab on PC sheet
* (stwlam) Show circumstance bonuses/penalties to AC on attack messages even when they sum to zero
* (stwlam) Add strike attack roll selectors for weapon group, base, and "other tags"
* (stwlam) Localize damage-type labels on damage roll cards
* (VestOfHolding) Fixing rendering vehicle-sheet description tab

### Data Updates
* (bennyt) Correct modifier for Liminal Fetchling bonus
* (cepvep) Brush up spell effects I-J
* (InfamousSky) Add RE to Berberoka for special impersonate
* (InfamousSky) Fill in deity items starting with Z
* (JDCalvert) Automate dual-handed assault feat
* (Manni) Brush up brine, cloud, magma, and umbral dragon spellcasters
* (Manni) Fix description of Greater Hat of the Magi
* (NullWolf, InfamousSky) Add Deity items from various Paizo sources
* (NullWolf) Add jouranl entries for archetype from SoT, MoM, LO:GB, G&G,
* (NullWolf) Add feat type "skill" to Masterful Obfuscation
* (NullWolf) Add inline save to Black Scorpion Greater Constrict.
* (NullWolf) Add range to Frost Vial Greater
* (NullWolf) Correct Dragonslayer's Shield Description
* (NullWolf) Correct Multiple Property Rune Icons
* (NullWolf) Correct Pistol of Wonder effects table
* (NullWolf) Correct rarity of multiple focus spells
* (NullWolf) Correct stealth dcs for hazards in mark of the mantis
* (NullWolf) Correct blowgun damage and type
* (NullWolf) Correct price on glaive weapon
* (NullWolf) Set critical-success condition to Notes on multiple Blade Ally effects
* (NullWolf) Set maxTakable for Skill Mastery feats
* (rectulo) Fix Dedication feats with a wrong feat type
* (rectulo) Fix a typo in details/descriptions of Reaper of Repose, Hunter's Dawn, and Habu's Cudgel
* (redeux) Add actors for PFS 3-10, 3-11, and Bounty 18
* (redeux) Update Stunning Fist on Yacob pregen
* (RexAliquid) Automate Spellmaster Dedication
* (Roxim) Add 2022 April Fools Blog Post Equipment
* (Roxim) Adjust area for Phantom Crowd Spell
* (Roxim) Brushup EC Book 2 NPCs part 2
* (SkepticRobot) Set slick and shadow runes to level 5 as per errata
* (SoldierC4) Add Heal's save, emanation, and roll
* (SoldierC4) Add Press-Ganged background from G&G
* (SoldierC4) Fix components of several cantrips
* (SoldierC4) Fix sources and rarities of backgrounds
* (SoldierC4) Fix several spells' rarity, traditions, components, and schools
* (SpartanCPA) Add Range 20 to Flaming Skull's Spit Fire ability
* (SpartanCPA) Add Sulfur Poisoning to Mud Pots
* (SpartanCPA) Fix rarity of Unshadowed Mariama
* (SpartanCPA) Brush up Blackfinger's Acolyte
* (stwlam) Add the alchemical trait to all firearm ammunition
* (stwlam) Fill out rule elements for Domain Initiate and Deity's Domain feats, update compendium Seelahs and Kyras
* (Supe) Condense duplicate innate spells in compendium into uses
* (Supe) Default check rolls to setting if skipDialog parameter is not given
* (Telekenunes) Fix or add rule elements on Enlarge, Resist Energy, and Uncanny Awareness.
* (Tikael) Add Outlaws Of Alkenstar Player's Guide content
* (Tikael) Add content from Strength of Thousands book 6
* (Tikael) Automate Bouncy Goblin feat
* (Tikael) Brush up Kitsune feats
* (Tikael) Fix several hazards with null stealth fields
* (Tikael) Fix the number of times advanced multiclass feats can be taken
* (TMun) Add several adventure-specific actions
* (TMun) Fix rule elements on Precise Strike class feature
* (VestOfHolding) Add content from Quest for the Frozen Flame book 3


## Version 3.7.2

### Bugfixes
* (stwlam) Prevent numeric modifiers from NPC attack items applying to other attacks
* (stwlam) Migrate items from GrantItem rule elements in case they come from non-system compendiums
* (stwlam) Fix issue preventing conditions from being added to actors in a sceneless world

## Data Updates
* (NullWolf) Add effect link to Rage action's description
* (NullWolf) Fix spell type and damage of multiple spells
* (NullWolf) Add Concussive trait to Shobhad Longrifle
* (Roxim) Brushup Extinction Curse Book 2 NPCs (part 1)
* (Roxim) Add an effect for Mountain Stronghold


## Version 3.7.1

### Bugfixes
* (stwlam) Fix dropping of physical items and spells onto hotbar
* (stwlam) Fix display of NPC weaknesses and resistances
* (Tikael) Fix reference to Olfactory trait description

### Data Updates
* (cepvep) Update Rule Element on Laughing Shadow
* (NullWolf) Correct Emerald Grasshopper skill Requirement
* (rectulo) Fix level of pact bound pistol
* (SpartanCPA) Add Ammunition Variants for Feather Tokens
* (SpartanCPA) Fix Persistent Bleed notes on Evangelist and Shanrigol
* (stwlam) Add rule elements to Golden Body feat
* (TMun) Update iconics Droogami, Korakai, Lini, Merisiel, Quinn, Sajan, Seoni, and Valeros

## Version 3.7.0

### New Features
* (putty) Add world clock buttons to advance to dawn, noon, dusk, and midnight
* (SkepticRobot) Add support for combining stacks of alike items via drag & drop

### Core System Improvements
* (Friz) Remove sell and equip buttons from loot actor sheets
* (Friz) Show skill modifier next to skill when displaying dialog for trick magic item check
* (fryguy) Show rarities in compendium browser lists
* (Supe) Separate unstyled and styled journals as separate configurable sheets

### Bugfixes
* (Drental) Fix processing of roll option toggles from modules
* (stwlam) Fix partially migrated data affecting use of Mountain Stance while wearing explorer's clothing
* (stwlam) Fix creating effect toggle macros from world items and strike toggle macros from PC sheets
* (stwlam) Ensure presence of property runes on unarmed strikes
* (stwlam) Fix hands-held predication on Arcane Cascade stance effect
* (stwlam) Fix shield-block toggle when using damage-adjustment dialog
* (stwlam) Fix "owner" user visibility of data on check roll messages

### Data Updates
* (AntsInMyEyesJ) Fix description of Confident Finisher action
* (dooplan) Add Separate Divine Font features
* (Friz) Add Note RE to Remorseless Lash feat
* (Friz) Fix description of Pernicious Poltergeist spell
* (InfamousSky) Correct Zinba's Slither action cost
* (LebombJames) Fix details of Quench spell
* (NullWolf) Correct Flame Tongue (Greater) Description
* (NullWolf) Correct Water Bomb and Mud Bomb Notes
* (NullWolf) Fix Mountain Stance / Animal Skin Rule Element for Explorer's Clothing
* (rectulo) Dedication feats with a wrong featType
* (redeux) Create effect for Potency Crystal
* (ricothebold) Add many equipment effect icons
* (stwlam) Fix typos in Boots of Bounding RE labels
* (stwlam) Predicate Enlarge's status bonus to damage on the weapon being melee
* (stwlam) Tone down light effect of the Light spell effect and Everburning Torch
* (Tikael) Add note RE to Stunning Fist
* (Tikael) Refresh Beginner Box pregens
* (TMun) Correct Flaming Star Major resistance and damage bonus; had values for flaming star greater.


## Version 3.6.2

### Bugfixes
* (stwlam) Fix styling of proficiency select menus on PC sheet
* (stwlam) Fix coin transfers between PCs and merchant actors

### Data Updates
* (NullWolf) Add effects to Goggles of Night
* (NullWolf) Set usage of Stole of Civility to "worn cloak"
* (stwlam) Restore "Ranger" trait to Running Reload feat
* (stwlam) Fix Fast Healing rule element on Battle Curse (Moderate) effect


## Version 3.6.1

### Bugfixes
* (stwlam) Remove workaround of bug in Foundry 9.254
* (stwlam) Fix most styling issues with the vehicle sheet's inventory tab
* (Supe) Fix issue causing disabled ability bonuses to duplicate several times


## Version 3.6.0

### New Features
* (stwlam) Add damage buttons to strike attack-roll messages
* (TMun) Add Sasmira's Pathfinder-themed Dice So Nice! textures to the system

### Core System Improvements
* (stwlam) Show check roll results to everyone by default
* (stwlam) Clear targets on encounter end, remove as target when a token's actor dies
* (stwlam) Prevent players from deleting chat messages, undoing surprise change made in Foundry 9.251
* (stwlam) Add support for GrantItem RE granting on actor update
* (stwlam) Add predication support to token rule elements
* (stwlam) Expose `JournalSheetPF2e` class at `CONFIG.PF2E.JournalEntry.sheetClass`

### Bugfixes
* (Cerapter) Fix handling ChoiceSet rule element's homebrew-item drop zone
* (Friz) Remove sell-treasure and carry buttons from Loot actor sheet
* (stwlam) Fix permissions on macros (e.g., Treat Wounds) intended for player use
* (stwlam) Fix bug causing PC sheets to become unopenable if they have an unexpected combination of crafting feats
* (stwlam) Fix cumulative item bonuses with Animal Skin and Mountain Stance
* (Tikael) Add predicate testing to BaseSpeed rule element, fix Quick Climb feat automation
* (Tikael) Fix simple hazard stealth DC display

### Data Updates
* (Manfred) Fix description of Petitioner of Axis from Bestiary 2
* (NullWolf) Fix spell type of multiple spells
* (NullWolf) Correct Helpful Poppet Rule Elements to Aid
* (rectulo) Fix level and crafting requirements of Smoke Screen Snare (Greater)
* (rectulo) Add description to Popdust alchemical item
* (rectulo) Fix the level of the counteract modifier of the anchoring rune
* (SpartanCPA) Have Raging Intimidation grant skill feats as the PC qualifies for them
* (Telekenunes) Automate Deep Vision and Aldori Parry
* (Telekenunes) Automate Feral Mutagen integration for Bestial Mutagens
* (Tikael) Remove Mountain Stance macro in favor of a single effect item


## Version 3.5.2

### Bugfixes
* (stwlam) Fix regression with automatic flanking detection
* (stwlam) Fix display of strike damage tooltips on PC sheet
* (stwlam) Correct some user-visibility quirks on spell cards
* (stwlam) Restore craft action macro

### Data Updates
* (NullWolf) Add Spell Effect: Calm Emotions
* (stwlam) Restore Ray of Enfeeblement as both an attack and save spell


## Version 3.5.1

### Core System Improvements
* (stwlam) Make no-ammo message more helpful for new players

### Bugfixes
* (stwlam) Fix several edge cases with DC labels on roll chat messages
* (stwlam) Fix structure of old character crafting data (affects only some PCs)

### Data Updates
* (JDCalvert) Set reload 0 values for several ranged weapons
* (NullWolf) Correct a handful of rituals' spell types from attack to utility


## Version 3.5.0

### Core System Improvements
* (stwlam) On system update, warn GMs for each active module without V9 compatibility
* (stwlam) Bundle Roboto font variants that include Cyrillic
* (stwlam) Enforce ammunition usage when necessary to strike
* (stwlam) Allow modules to change the behavior of Automatic Bonus Progression variant
* (stwlam) Disable recovery check button when not dying
* (Supe) Add rest for the night button to the sheet
* (Telekenunes) Added tooltips to PC sheet's tab navigation
* (Tikael) Add target roll options to action macros and improve automation of disarm

### Bugfixes
* (Chup) Fix color of select menu options on NPC sheet
* (Eddie) Fix Snarecrafter dedication & similar feats getting treated as daily preparation crafting
* (stwlam) Fix secret rolls when showRollDialogs setting is enabled
* (stwlam) Remove adding of item bonuses to bomb attack rolls when ABP is enabled
* (stwlam) Fix familiar statistics when using Proficiency Without Level
* (stwlam) Fix roll notes being unconditionally included in rolls
* (stwlam) Add workaround for Foundry not detecting temporary size changes on unlinked tokens
* (stwlam) Fix crafting-entry quick-add button when there are multiple crafting entries
* (Tikael) Fix repost leaking DC to players

### Data Updates
* (Abaddon) Brush up Abomination Vaults book 2, chapter 2
* (cepvep) Add ChoiceSet to Spell Effects A to E
* (Dorako) Fix link to Grabbed condition on Giant Pirate Skeleton
* (Friz) Fix traits on Spike Snare
* (LebombJames) Fix Dueling Cape effect duration
* (Mindbane) Add missing rule elements for Lucky Keepsake, Poison Resistance, and Illusion Sense
* (Monkey Bars) Add missing traits to Redpitch Bombs
* (Monkey Bars) Standardize sources for many items
* (NullWolf) Add missing skills to Kobold Trapmaster
* (NullWolf) Fix level and cost of Extendable Pincer
* (NullWolf) Add Resistance Rule Element to Resist Ruin ancestry feat
* (NullWolf) Add Spell effect for Lay on Hands (vs. Undead) and update spell description
* (NullWolf) Correct Crystal Shards description and damage
* (NullWolf) Correct typos on Several Creature Family Abilities
* (NullWolf) Fix predicate on Effect: Overwatch Field
* (NullWolf) Fix spell type, save type, and damage of multiple spells
* (NullWolf) Set correct traits for Spirit Strikes AdjustStrike Rule Element
* (putty) Automate one shot, one kill
* (rectulo) Fix description in Cold Comfort
* (rectulo) Fix the splash damage of sulfur bomb (all versions)
* (Sanderson Tavares) Automate stance on Reth
* (stwlam) Add a TokenEffectIcon RE to Everburning Torch
* (stwlam) Fix formula syntax in Reflecion of Life (Fast Healing) effect
* (TMun) Add One Shot 4 unique NPCs
* (Tikael) Add GrantItem to cleric doctrines and brushup missing automation
* (Tikael) Add Improvised tag and automate the penalty
* (Tikael) Add NPCs and needed items for QftFF 2
* (Tikael) Add One Shot 4 pre-gen PCs
* (Tikael) Add Pine Leshy heritage
* (Tikael) Add missing Skymetals
* (Tikael) Clean up resolving DCs for inline checks
* (Tikael) Fix inline button in Wishbound Belker
* (Tikael) Fix roll formulas containing functions inside braces
* (Tikael) Fix spacing after bolded text in compendium items


## Version 3.4.4

### Bugfixes
* (stwlam) Remove on-encounter-end effects if setting is enabled
* (stwlam) Fix bug causing effects from invested items to apply even when not invested
* (stwlam) Fix ability score used with melee usage of combination weapons
* (stwlam) Fix damage application to familiars and hazards
* (TikaelSol) Fix blind rolling of checks with the secret trait

### Data Updates
* (Abaddon) Review Chapter 1 of AV Book 2
* (rectulo) Fix a typo in the mudrock snare
* (stwlam) Replace Fatal Aim trait with Fatal on several two-handed firearms
* (TikaelSol) Grant Surprise Attack feature with Rogue Dedication
* (TikaelSol) Fix description of Ventriloquism spell
* (TikaelSol) Add fey trait to Fey-Touched Gnome heritage
* (TikaelSol) Add unarmed category to fighter weapon group improvements
* (TikaelSol) Fix spell type of several spells
* (TikaelSol) Change several instances of claws to claw in rule element selectors


## Version 3.4.3

### Core System Improvements
* (stwlam) Take token elevation into account when assessing flanking
* (stwlam) Represent token spaces as cubes rather than squares when calculating three-dimensional reach and range increments
* (stwlam) Provide sufficient information for Gravity Weapon effect to automatically determine number of weapon damage dice

### Bugfixes
* (stwlam) Fix rerolling attacks when flanking
* (stwlam) Work around Foundry bug that can adversely affect vision when activating a different scene
* (stwlam) Fix overriding damage type from Damage Dice rule element
* (stwlam) Remove experimental damage chat card formatting


## Version 3.4.2

### Bugfixes
* (SoldierC4) Fix stealth DC label on hazard sheet
* (stwlam) Fix application of armor speed penalties

### Data Updates
* (Tikael) Fix spell type of Imprint Message


## Version 3.4.1

### Core System Improvements
* (stwlam) Accommodate 0-hp eidolon play from Companion Compendia module when assessing flanking

### Bugfixes
* (SoldierC4) Localize familiar sheet save labels
* (stwlam) Filter trackable token attributes for relevance and circular-reference avoidance
* (stwlam) Fix predication system's handling of negative numbers
* (swtlam) Fix issue preventing error notification from getting sent out when players interact with a loot actor when a GM isn't logged in

### Data Updates
* (Cora) Make a handful of small corrections to Abomination Vaults bestiary
* (SoldierC4) Fix rule elements on Necrotic Bombs


## Version 3.4.0

### New Features
* (fryguy) Add carry type (held/worn/stowed) management for physical items
* (fryguy) Add Interact and Release buttons for weapons on the PC sheet's Actions tab
* (stwlam) Automate flanking and various ways to mitigate/ignore it
* (stwlam) Add a TokenLight rule element (see Everburning Torch and Spell Effect: Light)

### Core System Improvements
* (Friz) Add Quick Add button to crafting screen to allow one click adding formula to daily crafting
* (Glunt) Add item bonuses from weapons with appropriate traits to skill actions
* (SkepticRobot) Add increment and decrement controls to pc effect tab
* (stwlam) Create embedded items from kits in a single transaction
* (stwlam) Include rule element key in validation warnings sent to console
* (stwlam) Track whether a feat must be taken at level 1 or can be taken more than once
* (stwlam) Automate Fatal Aim trait
* (stwlam) Add a "lore-skill-check" modifier selector, implement with Brooch of Inspiration
* (Supe) Add spell damage roll options for type and category
* (Tikael) Remove Take Cover macro (now just requires single effect in Equipment Effects compendium)
* (unpaid_bill) Redesign the Familiar sheet

### Bugfixes
* (Abaddon) Fix default spellcasting entry names
* (Chup) Fix background color of dropdowns
* (Chup) Fix tab-button highlighting on PC sheet
* (In3luki) Fix compendium browser hazard tab sorting by level
* (stwlam) When using ABP, ignore equipment-based item bonuses from FlatModifier rule elements
* (stwlam) Apply result of initiative reroll to combatant's initiative score
* (Tikael) Add inline-specific selector for @Checks, set DC for only if specified
* (Tikael) Fix colliding toggles in Nimble Dodge and Dodge Away
* (Tikael) Exclude eidolons from the combat tracker (relevant to Companion Compendium module)

### Data Updates
* (Abaddon) Brushup giant fly, giant solifugid, vampiric mist, morlock, and dream spider
* (Abaddon) Brushup unseen servant
* (Abaddon) Change vampiric mist persistent damage notes to trigger on damage roll
* (Abaddon) Fix dance of ruin description for Vrock
* (Abaddon) Improve rule element localizations for bestiary 1
* (Abaddon) Localize bombs and bomb strikes for ratfolk grenadier and duergar bombardier
* (Abaddon) Localize persistent damage on strikes for bestiary 1
* (cepvep) Add ChoiceSet to Spell Effects up to L
* (cepvep) Fix Tiller's Drive speed type
* (cepvep) Add ChoiceSet to Ring of Energy Resistance
* (Cerapter) Fix Sovereign Draconic bloodline being referred to as "mental" in damageType determination for Sorcerers
* (Cora) Add familiar abilities for GB and SoM to the compendium
* (InfamousSky) Add template buttons to Weapon Storm description
* (InfamousSky) Fix FotRP Dervish perception, attack bonus, damage and action cost
* (InfamousSky) Fix Shoggoth alignment
* (InfamousSky) Fix Vital Beacon effect duration
* (markusfaehling) Fix missing values in QftFF bestiary compendium
* (SoldierC4) Localize bomb notes
* (SoldierC4) Localize the rest of the bomb notes
* (SoldierC4) Scrub @Check names and traits (7)
* (SpartanCPA) Add horizontal line elements to Aura abilities
* (SpartanCPA) Review and make corrections to Abomination Vaults Book 1
* (SpartanCPA) Update Family Abilities for Ghoul/Ghast/Ghost
* (stwlam) Limit oracle martial weapon expertise to battle mystery
* (TMun) update the iconics and add new iconics art
* (Tikael) Add Content from Lunar New Years blog
* (Tikael) Add missing weapons from LOGB and AoE
* (Tikael) Brushup the Beginner Box NPCs and hazards
* (Tikael) Consolidate Oracle Curse effects
* (Tikael) Fix bleed damage on NPC strikes
* (Tikael) Fix inline roll formatting for Xotanispawn
* (Tikael) Fix inline roll on Bharlen Sajor
* (Tikael) Fix the description of Divine Decree
* (Tikael) Stop multiclass druids from getting too many focus points


## Version 3.3.1

### Core System Improvements
* (stwlam) Apply range penalties to NPC strikes when applicable

### Bugfixes
* (Chup) Fix display issue on PC sheet when max HP is a single digit
* (stwlam) Fix handling of third-party compendium imports
* (stwlam) Fix scale-change detection for small tokens
* (stwlam) Fix issue preventing adding more than one of the same feat that grants other feats
* (stwlam) Fix underyling issue causing Paragon's Guard effect to not work

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
* (NullWolf) Correct name of Gasping Marsh spell
* (NullWolf) Add missing strike effect to Dream Spider
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
