## 5.16.1

### Bugfixes

-   (stwlam) Also support markdown parsing for item alteration description overrides
-   (stwlam) Fix foundry content links being treated as markdown links in description item alterations

### Data Updates

-   (Abbadon, DocSchlock, kromko, Rigo) Many corrections for Howl of the Wild data
-   (Abbadon) Fix localization and slug for the ethereal trait
-   (Dire Weasel) Add effect for Aeon Stone (Pink Rhomboid)
-   (Dire Weasel) Update Heal companion to remaster
-   (Dire Weasel) Replace more system icons for higher res core icons
-   (Dire Weasel) Add effects for Howl of the Wild elixirs
-   (DocSchlock) Add Breaker Surki Digging Damage to the evolution
-   (DocSchlock) Automate Chromatophores from Howl of the Wild
-   (DocSchlock) Add some automation for Werecreatures, Clawdancer, Thlipit, and Winged Warrior
-   (DocSchlock) Fix Gun Sword damage values
-   (DocSchlock) Fix Organsight not applying to spells
-   (kromko) Fix invalid casters in Awaken Portal
-   (kromko) Update distances for telepathy and sense acuity for a large number of bestiary creatures
-   (kromko) Simplify descriptions for Dracolisk abilities
-   (Nisviik) Fix automation for Sweet Dream Insight and Sweet Dream Glamour
-   (rectulo) Fix order skill for Spore Order
-   (Tikael) Update Green Man deity to remaster

## 5.16.0

### Data Updates

-   (Avagdu, DocSchlock, Dogstarrb, Rigo, Roxim, Tikael, TMun) Add content from Howl of the Wild
-   (Abaddon) Update familiar elemental ability for remaster
-   (DocSchlock) Update Winter Sleet stance effect to also match the errata
-   (kromko) Fix localization for angel and animal traits
-   (Rigo) Add automation for Phase Bolt
-   (Rigo) Update missing instances of Inventor Unstable DC errata (Clockwork Celerity/Explosive Leap/Haphazard Repair/Negate Damage)

## 5.15.4

### Bugfixes

-   (Supe) Fix cantrips and focus spells casting at 1st rank for NPCs above level 20
-   (Supe) Set spellcasting proficiency to trained if at least one spellcasting entry exists

### Data Updates

-   (Abbadon) Minor corrections for Triggerbrand Salvo, Malevolent Mannequins, and Harlo Krant
-   (Ambrose M) Add automation for Strix Flight feats, Life Link, and Hand of the Apprentice
-   (Cuingamehtar) Add new creature trait descriptions from Monster Core
-   (Dire Weasel) Improve automation of Emblazon Feats
-   (Dire Weasel) Update Sending's target and refresh it on all NPCs
-   (DocSchlock) Fix description of the Injection trait
-   (DocSchlock) Minor corrections for Bort's Blessing, Consecrate, and Tekko-Gaki
-   (jfn4th) Fix message formatting for hag blood magic
-   (LJSmith066) Fix Meteor Swarm for all NPCs in the bestiary
-   (LJSmith006) Add automation for Mechanical Symbiosis
-   (Rigo) Add effects for the Hero Point Deck
-   (Tikael) Add automation for Pitborn
-   (Tikael) Fix Barbarian's Spirit Instinct's Greater Weapon Specialization
-   (Tikael) Restored Ancestry Guide Tiefling and Aasimar feats as Nephilim feats with remaster edits
-   (Tikael) Incorporate Errata from May 17, 2024
-   (Dire Weasel, Tikael) Minor corrections for PFS and Bestiary NPCs

## 5.15.3

### Bugfixes

-   (Supe) Fix invalid centering in spell descriptions

### Data Updates

-   (Rigo) Fix inventor class DC in Gigaton Strike / Deep Freeze / Megavolt

## 5.15.2

### System Improvements

-   (Dire Weasel) Remove some redundant data from npc spell slots in the build
-   (DocShlock) Add damage roll toggle for the twin trait
-   (In3luki) Handle search queries with diacritics in compendium and compendium browser searches
-   (Supe) Show exploration mode Travel Speeds in the Party Sheet's exploration tab
-   (Supe) When applying an effect with labels that rolls a formula (such as Ancestral Influence), also show the label in the roll chat message.
-   (Supe) Run predicates on the Choice Set rule element's options when loaded from a path, such as when injected by ActiveEffectLikes.

### Bugfixes

-   (Abaddon) Fix incorrect use label for consumables
-   (In3luki) Prevent players from gaining vision from lootable tokens by selecting them
-   (DocShlock) Fix the display of rollmode (private/blind roll and such) in the damage roll dialog
-   (Supe) Allow tokens of the same linked actor to flank with each other to support abilities such as Mirror's Reflection.
-   (Supe) When rolling inline damage from a hazard's routine when name visibility is hidden, avoid revealing the actor's name
-   (Supe) Fix IWR for inline damage involving certain traits such as holy/unholy damage in certain cases
-   (Supe) Fix inline checks and saves in expanded descriptions from self effect actions
-   (Supe) Fix disabled toggleables with dropdowns that have been expanded by class features. This fixes finisher damage continuing to be rolled even without panache.
-   (Supe) Restore an item with unresolved choice selection's ability to disable its own rule elements. This avoids certain scenarios where not selecting an option led to a bricked actor.
-   (Supe) Fix the Actor Traits rule element form from removing resolvable traits
-   (Supe) Fix target mark predication for ephemeral effects
-   (Supe) Remove references from the previous master when changing the familiar to a new master

### Data Updates

-   (Chas) Fix action cost of Familiar Focus
-   (Cuingamehtar) Add missing ability names to some AV NPCs
-   (Cuingamehtar) Add missing monster core trample strikes
-   (Cuingamehtar) Fix some textual errors in some of the bestiary creatures
-   (Cuingamehtar) Fix Otyugh Filth Fever stage 1 duration
-   (Cuingamehtar) Fix some grammer and formatting issues in Bestiary 3
-   (Cuingamehtar) Fix Electrify Armor's inline damage roll
-   (Cuingamehtar) Fix Devourer's Devour Soul Save DC
-   (Dire Weasel) Add automation for Martyr
-   (Dire Weasel) Add a 5th slot to Kyra (level 5)'s divine font for remaster rules
-   (Dire Weasel) Add inline intimidation check to Spiritual Disruptor
-   (Dire Weasel) Add inline damage link to Fire Ray
-   (Dire Weasel) Add inline diplomacy check for No Cause for Alarm
-   (Dire Weasel) Add inline damage roll for Algriever Venom
-   (Dire Weasel) Add unified effect for Tempest Form
-   (Dire Weasel) Fix ordering of Argyrzei's Silver Blade damage types
-   (Dire Weasel) Fix effects for Recall Under Pressure and Deck of Destiny
-   (Dire Weasel) Fix damage label for scorching blast and clean up some lighting data in several effects
-   (Dire Weasel) Fix Cilio's fist attack effect to be Blinding Rot
-   (Dire Weasel) Fix name for Shadow of Sezruth
-   (Dire Weasel) Update Forbidden Ward to use a TokenMark rather than a RollOption toggle
-   (Dire Weasel) Refresh The Keeper's spell list and fix Spell DC
-   (DocShlock) Add Relic trait to armor and shields
-   (Drental) Fix Tian Xia World Guide bestiary not being assigned to the correct pack folder
-   (eepMoody) Fix duration of Guided by the Stars
-   (Intervención) Update Cassisian helmet's inline damage to area damage
-   (jfn4th) Fix Simeek's Attribute Modifiers
-   (rectulo) Update avatar's description for remaster
-   (reyzor1991) Fix Fury Instinct Raging Resistance
-   (Rigo) Add hidden vs invisible suboption to the Wisp's go dark ability
-   (Rigo) Allow surface cantrips to be chosen with the PSI Development feat
-   (Supe) Do not show the Megaton Strike toggle for construct innovation inventors
-   (TMun) Add PFS Quest 18 npcs
-   (Tikael) Add damage traits to armor and shield traits
-   (Tikael) Organize Heritages into subfolders
-   (Trent) Add automation for the Keen Follower feat
-   (Valinora) Fix typo in Artisan's toolkit description

## 5.15.1

### System Improvements

-   (redeux) Set default level in party check level-based DC's to average party level
-   (Supe) Show GM Notes in item summaries
-   (Supe) Add world time setting for imperial calendar
-   (Supe) Expose `Predicate` for module use

### Bugfixes

-   (stwlam) Fix styling of action traits on familiar sheet
-   (stwlam) Prevent loss of modifier adjustments from property runes
-   (stwlam) Scale scatter damage with number of weapon damage dice
-   (Supe) Avoid filtering homebrew creature traits from ability items
-   (Supe) Fix overriding spell area in fixed heightening
-   (Supe) Fix inclusion of parent roll options in predication tests of modifier clones
-   (Supe) Fix validation of `override` mode damage dice faces item alterations
-   (Supe) Include item options in target context clones
-   (Supe) Fix adding skills to deities

### Data Updates

-   (Abaddon) Add Goodberry to renamed spells page of Remaster Changes journal entry
-   (Abaddon) Add metal and wood domains to Domains journal entry
-   (Abaddon) Add scaling persistent fire damage to scorching blast
-   (Abaddon) Fix Hair Trigger prerequisite
-   (Abaddon) Remove broken spell links from granted deity spells
-   (Dire Weasel) Add automation for Gallop
-   (Dire Weasel) Add cold damage partial to Kargstaad's Hatchet Strike
-   (Dire Weasel) Add custom resistances for some liches and vampires
-   (Dire Weasel) Add effect for Vescavor's Chaotic Spawning, Vilderavn's Aura of Disquietude
-   (Dire Weasel) Add effect, area, and leveled damage link for Volcanic Eruption
-   (Dire Weasel) Add links to Bone Prophet's Raise Serpent
-   (Dire Weasel) Add reach automation for Shadow Giant's Shadow Chain and Vordine's Trident of Dis
-   (Dire Weasel) Add template to Transmute Rock And Mud and update description to use lists rather than bullets
-   (Dire Weasel) Fix action cost and inline damage of Vloriak's Spew Rusted Shards
-   (Dire Weasel) Fix damage type of Spider Sting
-   (Dire Weasel) Fix defenses and size of Mighty Bul-Gae
-   (Dire Weasel) Fix description of Flawed Orb of Gold Dragonkind
-   (Dire Weasel) Fix Fearsome Brute multiplier for master Intimidation
-   (Dire Weasel) Fix formatting error in Energy Breath Potion (Sonic, Lesser)
-   (Dire Weasel) Fix Gimmerling's Sly Disarm action cost
-   (Dire Weasel) Fix links in Smoke Ball (Lesser)
-   (Dire Weasel) Fix missing exceptions for Zecui's Harden Chitin resistance
-   (Dire Weasel) Fix skill bonuses for Immense Mandragora
-   (Dire Weasel) Remove incorrect Agathion trait from Hryngar Forgepriest
-   (kromko) Fix description formatting of many items
-   (kromko) Fix formatting of several Spell descriptions
-   (kromko) Make minor formatting and grammar changes in Bestiary 2 item descriptions
-   (Manni) Fix item description on Age of Ashes NPC
-   (redeux) Add Routine to Helpful Wisp Swarm (PFS 5-13)
-   (Rigo) Add description alteration for Dragons Breath
-   (Rigo) Add effect for Cascade Countermeasure
-   (Rigo) Add Monster Core's Banshee
-   (Rigo) Correct Glimpse Weakness scaling and fix other data errors
-   (Rigo) Fix Ghostly Resistance definitions
-   (Rigo) Remove surface cantrips as a choice for archetype psychics
-   (Rigo) Use Item Alteration for Spellstrike recharge reminder in Conflux Spells
-   (SpartanCPA) Add actors from PFS Quest #17
-   (SpartanCPA) Adjust old dragon names to match Monster Core standard
-   (SpartanCPA) Adjust Remastered Ghost Resistances
-   (SpartanCPA) Correct action type of Retract Body (Monster Core)
-   (stwlam) Correct level of standard-grade adamantine armor
-   (stwlam) Fix hands value of Tetsubo
-   (Supe) Tweak Ferrous Form and add effect for alloy flesh and steel
-   (Surge) Make many corrections to Monster Core data
-   (Tikael) Add 2024 April Fools blog creature
-   (Tikael) Add effect for Lava Leap
-   (Tikael) Fix level of Waldgeist
-   (Tikael) Fix stats of Topiary beast and monster
-   (Tikael) Tone down light on Shining Child

## 5.15.0

### Highlights

-   (Avagdu, Dire Weasel, SpartanCPA) Add creatures from Monster Core
-   (Avagdu) Update Player Core iconics at levels 3-5 to remaster versions

### Bugfixes

-   (In3luki) Update elite/weak adjustments to reflect changes in GM Core
-   (In3luki) Fix issue causing enemy DCs to appear to players following rerolls
-   (stwlam) Fix parentheses sometimes appearing in private damage rolls
-   (stwlam) Replace usage of `Array#toReversed` with `Array#reverse` to accommodate very old versions of Chrome
-   (Supe) Fix actors directory showing familiars at level 0 and familiar-triggered errors thrown in party actors
-   (Supe) Fix formatting for Feint Army tactical war action
-   (Supe) Fix rolling army skills and initiative

### Data Updates

-   (Avagdu) Add "Meet the Iconic" Backstories to Official Iconic Characters
-   (Dire Weasel) Add automation for Catch Rock, Discerning Strike, Polearm Tricks, Prayer Attack, Thorough Reports, and Twist the Hook
-   (Dire Weasel) Add inline performance check to Counter Performance
-   (Dire Weasel) Fix Clockwork Fabricator's Constrict damage link
-   (Dire Weasel) Fix Yuni's level
-   (Dire Weasel) Move some description text to GM notes for Ring of Bestial Friendship
-   (Dire Weasel) Update Poltergeist Telekinetic Object and Telekinetic Storm
-   (Dire Weasel) Update Treat Wounds description to text in Player Core
-   (Drental) Remove old darkvision and low-light-vision ancestry Features
-   (kromko) Fix description of Second Chance's action
-   (kromko) Remove duplicate lore from Chandriu Invisar
-   (rectulo) Fix Description of Midnight Milk (refined)
-   (rectulo) Fix prerequisite of Steal Vitality
-   (Rigo) Add missing conscious mind info in class feature and classes journal
-   (Rigo) Fix Enervating Wail's damage formula
-   (stwlam) Fix action type and cost of Scare to Death
-   (Surge) Update Light of Truth effect
-   (Tikael) Add spell effect for Harrowing ritual
-   (Tikael) Fix traditions of Briny Bolt
-   (Tikael) Move Curse of Outpouring Life toggle to spellcasting

## 5.14.4

### Bugfixes

-   (stwlam) Fix issue causing damage/critical icons to appear to players when Show Check Outcomes is disabled
-   (stwlam) Restore application of volley penalty to weapon-infused elemental blasts
-   (Supe) Fix sizing and scrollability of NPC loot sheet
-   (Supe) Omit common language from party sheet languages
-   (Supe) Restore spell/healing domain in spells

### Data Updates

-   (Abaddon) Fix prerequisites of Edgewatch Detective Dedication, Scholastic Identification, and Shoving Sweep
-   (Dire Weasel) Fix rarity of Arms of the Drowned
-   (Dire Weasel) Fix price of Root Boots
-   (Dire Weasel) Handle alchemical trait in IWR
-   (Dire Weasel) Populate some empty predicates
-   (Intervención) Update Cassisian Helmet rule element to predicate on unholy trait
-   (kromko) Add missing spells to Fluid Form Staff (Major)
-   (Rigo) Add effects for Inertial Barrier and Mental Balm
-   (Rigo) Brush up some Spell Trickster automation
-   (Rigo, Tikael) Remove erroneously added attack trait from several spells
-   (SpartanCPA) Add Monster Core NPCs revealed in Paizo Blog
-   (Tikael) Add missing trait to several Fist of the Ruby Phoenix actors
-   (Tikael) Add inline template to Scorching Column

## 5.14.3

### Bugfixes

-   (stwlam) Restore range penalties to strike attack rolls
-   (stwlam) Avoid declaring tokens to be vision sources when sight is disabled

### Data Updates

-   (Drental) Fix stats of Clockwork Belimarius
-   (In3luki) Show impulse junction note on elemental blast attack roll instead of damage roll

## 5.14.2

### Bugfixes

-   (Clemente) Fix Party's Hexploration Speed missing localization
-   (In3luki) Fix NPC sheet initiative only showing perception
-   (j-bs) Fix issue preventing checks from being rolled from kingdom sheet
-   (stwlam) Fix issue blocking flanking from being recognized during damage rolls
-   (stwlam) Prevent players from acquiring vision from controlled tokens without at least observer ownership
-   (Supe) Fix Kingdom feat styling

### Data Updates

-   (Dire Weasel) Automate invisibility grant for Wisp's Go Dark
-   (Dire Weasel) Fix Bulk of chest
-   (DocSchlock) Add Haagenti to Deities
-   (LebombJames) Correct Agitate save as not Basic
-   (LebombJames) Correct Escape Fulu activation action cost
-   (Rigo) Exclude alternate amps from Parallel Breakthrough
-   (Rigo) Hide disabled damage dice and modifiers in Parallel Breakthrough
-   (Tikael) Fix focus point cost of Psychic Dedication amps

## 5.14.1

### Bugfixes

-   (stwlam) Fix issue preventing most modifiers from being included in damage rolls

### Data Updates

-   (Clemente) Fix typos in some localization strings
-   (Tikael) Fix amping spells for psychic dedication
-   (Tikael) Fix determination of which kineticist aura junctions should apply

## 5.14.0

### System Improvements

-   (In3luki) Support Babele's `originalName` property in compendium browser search
-   (Dire Weasel) Fix disabled appearance of NPC resistances header
-   (DocSchlock) Show Force checkbox on FlatModifier Form when Attribute selected
-   (DocSchlock) Add Hero Point RollOption on rerolls
-   (DocSchlock) Add Metagame Setting to ignore the Secret Trait on Checks
-   (DocSchlock) Add sound emission to Vehicles
-   (DocSchlock) Add support for Effect Badge Labels that loop to start
-   (DocSchlock) Add support for up to two divine skills in deity items
-   (Drental) Add targetOwner option to `@Check` syntax
-   (j-bs) Add a Limited view for Familiar Sheets
-   (j-bs) Add item links to item transfer chat messages
-   (j-bs) Fix broken non-land Base Speed tooltip labels in creature documents
-   (j-bs) Fix display of Master name in Familiar sheet when User is an `Observer`
-   (stwlam) Add per-action toggle for mindshift trait
-   (stwlam) Add support for weapon damage type and die size alterations
-   (stwlam) Add Damage Alteration rule element (able to target damage components by slug)
-   (stwlam) Implement handling of Double Barrel trait
-   (stwlam) Make compendium directory and browser search able to process words in non-roman scripts
-   (stwlam) Add and enforce module blacklist (PF2e Action Support Engine currently only member)
-   (Supe) Add support for persistent damage conditions dropped on actor sheets
-   (Supe) Color encumbrance bar yellow when encumbered
-   (Supe) Handle temporarily-resized actors when dropping equipment from compendium
-   (Supe) Hide merchant coins and empty loot sections from players
-   (Supe) Only show unit price/bulk in merchant sheets
-   (Supe) Show tooltip for modifier/dice roll options in inspector
-   (Tikael) Enable IWR automation by default

### Bugfixes

-   (DocSchlock) Fix the damage section of spell sheet misrendering when material effect is added
-   (DocSchlock) Hide name of Lootable NPCs depending on Token Name Visibility setting
-   (In3luki) Ensure PFS HP bump is an integer
-   (LebombJames) Fix padding on familiar sheet headers
-   (stwlam) Fix non-mental NPC skills being affected by stupefied condition
-   (stwlam) Allow spell summaries to be expanded on non-editable actor sheets
-   (stwlam) Fix ranged weapons getting included in melee-only weapon choice sets
-   (stwlam) Make shield auxiliary actions available when in stances that restrict strikes
-   (stwlam) Prevent counting Common and its corresponding language as two allocated languages
-   (stwlam) Retain whisper recipients when selecting spell variants from chat
-   (Supe) Fix rendering and disabling check substitutions
-   (Supe) Apply item alterations and sanctification to scrolls/wands
-   (Supe) Ignore hardness when applying damage from Token HUD

### Data Updates

-   (Avagdu) Fix bulk of Jiu huan dao and remove Nine-ring sword
-   (Avagdu) Remove the legacy Healing version of Touch of Corruption
-   (putty) Add Tok-Nikrat Scouts army
-   (Cerapter) Fix Cleric Doctrines granting features based on predication rather than flags
-   (Chet Husk) Add missing traits to Theatrical Mutagen
-   (Cora, Dire Weasel, Tikael) Brushup beginner box NPCs
-   (Dire Weasel) Add automation for Earth Block, Grabble Forden's Poison Conversion, Ibrium's Vitrumancy, Hurried Retreat, Mostly Harmless, Lunge, Planar Workshop, Rhenei's Elemental Bloodline, Shocker Lizard's Amplify Voltage/Shocking Burst, Sixth Pillar Student's Bludgeoning Energy, several minor deity curses
-   (Dire Weasel) Add cold damage overlay to Final Sacrifice
-   (Dire Weasel) Add custom resistance to effect for Push Back the Dead!
-   (Dire Weasel) Add damage partial to Curse Of Lost Time
-   (Dire Weasel) Add effects for Emaliza Zandivar's Warded Casting, Figment, Overextending Feint, Vomit Tar, Warp Step
-   (Dire Weasel) Add immunity effect link to remastered Battle Medicine
-   (Dire Weasel) Add resistance to Frost Brand
-   (Dire Weasel) Add spell links to Bonmuan Swapping Stone, Ferrumnestra and Laudinmio
-   (Dire Weasel) Add traits and fix errata'd DC for Jaathoom's Scarf
-   (Dire Weasel) Add unified effects for Animal Feature, Rune Giant's Invoke Rune
-   (Dire Weasel) Add Winged Sandals to Remaster Changes journal entry
-   (Dire Weasel) Automate Chesjilawa Jadwiga Karina fireball damage override
-   (Dire Weasel) Brush up Cursed King's Berserk, Rebounding Breastplate description, Robe of the Archmagi, Shristi Melipdra, Silversoul Bomb, Soothing Mist, Swig effect
-   (Dire Weasel) Convert Produce Flame's inline damage link to @Damage and refresh copies
-   (Dire Weasel) Fix Alchemist's Haversack to be container
-   (Dire Weasel) Fix bulk of Clan Pistol
-   (Dire Weasel) Fix damage links in Bloodspray Curse to autolevel
-   (Dire Weasel) Fix damage type of Foretold Ruin's routine, ero's Defiance, Life Siphon, Noxious Metals, Soothing Spring, and Wholeness of Body
-   (Dire Weasel) Fix errata'd rarity of Culdewen and Drainberry Bush
-   (Dire Weasel) Fix formatting of Staff of the Black Desert's description
-   (Dire Weasel) Fix Fresh Produce void resistance
-   (Dire Weasel) Fix heightening interval for Unusual Anatomy and add resistance to effect
-   (Dire Weasel) Fix Ijda's spellcasting
-   (Dire Weasel) Fix localized strings for Brain Collector's Brain Blisters
-   (Dire Weasel) Fix price of Blast Lance (Greater) and add striking rule element
-   (Dire Weasel) Fix saving throw type for Clinging Ice and brush up effect
-   (Dire Weasel) Fix several magic items to be specific
-   (Dire Weasel) Fix some malformed links in bestiary abilities
-   (Dire Weasel) Fix token name for Conference Z's Victims (9-10)
-   (Dire Weasel) Fix Treerazer's Staggering Strike
-   (Dire Weasel) Fix typo in flail critical specialization
-   (Dire Weasel) Improve automation for Subduing Attack and Hampering Strike
-   (Dire Weasel) Make effect for Touch of the Moon looping
-   (Dire Weasel) Remove damage partial from Enervation in favor of autoleveling inline damage links
-   (Dire Weasel) Set warden spell feats to be takable an unlimited number of times
-   (Dire Weasel) Switch localizable strings used for Mechanical Torch and Glowing Lantern Fruit
-   (Dire Weasel) Update Cataclysm to use damage partials rather than damage link
-   (Dire Weasel) Update Grabble Forden's Poison Conversion to use DamageAlteration
-   (Dire Weasel) Update Lunging Stance to reference Reactive Strike
-   (Dire Weasel) Update Restoring Blood to be vitality healing
-   (DocSchlock) Add Effect for Vigorous Anthem
-   (DocSchlock) Add familiar ability RollOptions to familiars
-   (DocSchlock) Fix Elemental Explosion's damage calculation
-   (DocSchlock) Fix Mummy Dedication ChoiceSet activating
-   (DocSchlock) Fix text in Psychic and Summoner journal entry pages
-   (DocSchlock) Fix Twin Distraction Class DC
-   (DocSchlock) Update Deity compendium entries for multiple skills
-   (Fin) Update CONTRIBUTING.md to reference ORC license
-   (InfamousSky) Fix size of Clockwork Goggles
-   (Intervención) Add missing traits to Briny Bolt
-   (kromko) Add missing area to Strange Geometry description
-   (kromko) Add Weapon Storm overlays with different areas
-   (kromko) Fix Caustic Blast's persistent damage
-   (kromko) Fix secondary casters of Awaken Portal ritual and move spoilers to GM notes
-   (LebombJames) Add self effect for Smite evil
-   (LebombJames) Add spell description alteration for accursed staff
-   (LebombJames) Update Disciple's Breath inline damage
-   (n1xx1) Restore new lines and fix formatting in journal entries
-   (Rigo) Add effect for Ancestral Geometry tattoo, Empathetic Plea's damage penalty
-   (Rigo) Add notes and automation for champion reaction upgrade feats
-   (Rigo) Add self-applied effect for Inventive Offensive
-   (Rigo) Automate Spell Trickster archetype
-   (Rigo) Automate Vengeful Oath
-   (Rigo) Brush up and/or automate several Bard, Cleric, and Swashbuckler feats/features
-   (Rigo) Fix typos in Oscillating Wave conscious mind, Quiet Allies feat
-   (Rigo) Grant a swim speed with Natural Swimmer
-   (Rigo) Limit android feats description alterations to nanite surge feat
-   (Rigo) Limit patron familiar ability description alteration to Witch class characters
-   (Rigo) Move finishers to mergeable suboptions
-   (Rigo) Update Champion Smite effects to remaster errata
-   (Rigo) Upgrade Selfish Shield resistance based on Divine Smite
-   (rectulo) Add missing spell links to Winter's Breath
-   (rectulo) Fix formatting in description of Purgatory Emissary's staff and Staff of the Black Desert
-   (rectulo) Fix rank for spells in Pistol of Wonder
-   (rectulo) Fix reference to spell level in Dragonfire Halfbow
-   (rectulo) Fix description of Dawnflower Beads to reflect remastered text
-   (rectulo) Fix typos in Lesser Ghost Charge and Locket of Sealed Nightmares
-   (reyzor1991) Add Aura Junction Metal effect
-   (SpartanCPA) Add EphemeralEffect to Tumble Behind
-   (SpartanCPA) Localize NPC Change Shape abilities
-   (SpartanCPA) Create Compendium for Monster Core and include blog content (Mummy)
-   (SpartanCPA) Update Bestiary Family Abilities to ORC License
-   (stwlam) Add choice set for muse to Bard Dedication
-   (stwlam) Add item-casting special statistic to Jafaki
-   (stwlam) Correct quantity of level-1+ alchemical ammo producible via Munitions Crafter
-   (stwlam) Fix predicate and usage of Lucky Keepsake
-   (stwlam) Remove Tandem feats from Basic Synergy options
-   (Tikael) Add actors for PFS scenario 5-11
-   (Tikael) Add preselection for Nomad and Mantis Scion's Assurance grants
-   (Tikael) Add Seven Dooms for Sandpoint player's Guide content
-   (Tikael) Add spell links to Mask of the Banshee
-   (Tikael) Automate amp feats
-   (Tikael) Automate Grievous rune for firearms
-   (Tikael) Automate Psychic Dedication amps
-   (Tikael) Brush up description of Devil's Trident
-   (Tikael) Cleanup Jann Shuyookh and Quickiron Plasm
-   (Tikael) Fix labels and slugs in Finisher migration
-   (Tikael) Migrate swashbuckler finishers to new rule elements
-   (Tikael) Remove double linebreaks from compendium items and actors
-   (Tikael) Remove several generic glossary items from NPCs
-   (Tikael) Restructure Kineticist class features
-   (Tikael) Set Radiant Circuitry's effect as a self effect
-   (Trent) Finish Robe of the Archmagi automation

## 5.13.6

### Bugfixes

-   (DocSchlock) Fix non-hero point rerolls

### Data Updates

-   (Abaddon) Fix reference to actor level in Thoughtform Summoning feat
-   (Dire Weasel) Add roll links to Hide and Sneak actions
-   (Simon Ward) Clean up formatting in Pitax Horde description
-   (stwlam) Fix inclusion of crossbows in Singular Expertise

## 5.13.5

### Bugfixes

-   (Drental) Fix handling of check DCs tied to inline roll links added directly to actor sheets
-   (j-bs) Fix variable-cost action glyphs in Spell Compendium
-   (stwlam) Fix processing of precision resistance
-   (Supe) Fix rank of base spellcasting proficiency and innate spells

### Data Updates

-   (Dire Weasel) Clean up formatting in Luck Blades, Shatter Mind, and Splinter Faith
-   (Dire Weasel) Fix bonus type for Nourishing Gate
-   (Dire Weasel) Remove prerequisites from Rallying Anthem
-   (kromko) Add missing area to Safe Passage description
-   (putty) Fix Kingmaker skirmisher army level
-   (stwlam) Fix sticky bomb applying when not toggled, account for expanded splash
-   (Tikael) Automate Parallel Breakthrough feat
-   (Tikael) Fix sources of Season of Ghosts rituals
-   (TMun) Add Kingmaker Appendix armies along with unique tactics

## 5.13.4

### Bugfixes

-   (stwlam) Restore ability to create any combination of qualifying alchemical items using field discoveries
-   (stwlam) Fix resolving damage dice number overrides that reference spells and weapons

### Data Updates

-   (Dire Weasel) Fix missing versatile piercing for Bestial Manifestation claw attack
-   (Tikael) Add missing amp automation for Daze and fix Ignition's amp scaling
-   (Wonton) Fix publication data and move spoiler text to GM notes for several rituals

## 5.13.3

### System Improvements

-   (stwlam) Allow Sense rule elements to apply to NPCs
-   (stwlam) Automate addition of swarm condition immunities, update construct immunities to reflect GM Core
-   (stwlam) Make passive spell defenses editable
-   (stwlam) Attempt to parse out whether spells are melee/ranged and set roll options
-   (Supe) Add create bonus feat button to kingdom sheet
-   (Supe) Move kingdom ability modifier computation to later step so as to targetable by rule elements

### Bugfixes

-   (Grambles) Correct precision damage getting halved by critical success
-   (nikolaj-a) Fix identification of mystified mundane items

### Data Updates

-   (bryanconrad) Correct duration for Soothing Words to match Player Core
-   (Dire Weasel) Add effect for Hallowed Ground
-   (Dire Weasel) Add ingested point immunity to Smog Giant
-   (Dire Weasel) Add light automation and effect for Ghost Lantern
-   (Dire Weasel) Add link to Invisibility from Mislead
-   (Dire Weasel) Add note to Serpent Dagger
-   (Dire Weasel) Brush up Darkside Mirrors, Elysian Dew descriptions
-   (Dire Weasel) Fix automation for Man-Feller
-   (Dire Weasel) Fix Celestial Staff and Hell Staff to be specific items
-   (Dire Weasel) Fix Delay Affliction to deliver healing
-   (Dire Weasel) Fix malformed links to Marvelous Mount in Staff of Summoning
-   (Dire Weasel) Fix Occultism choice set option in Weight of Experience
-   (Dire Weasel) Fix price of Bravery Baldric (Haste)
-   (Dire Weasel) Fix rank of Life's Flowing River
-   (Dire Weasel) Fix Shredskin immunity to critical hits (except slashing)
-   (Dire Weasel) Fix Summon Healing Servitor to be both damage and healing and add effect
-   (Dire Weasel) Refresh Shobhad Sniper's copy of Shobhad Longrifle
-   (Dire Weasel) Remove damage partial from Life's Flowing River and add inline damage links
-   (Dire Weasel) Standardize selector for Jabali's Dice
-   (DocSchlock) Add Faerie Fire to Remaster Changes journal entry
-   (DocSchlock) Add Magical Trait to Strikes granted by Morph spell effects
-   (kromko) Change Nature's Bounty damage kind to healing
-   (kromko) Update Geas description
-   (mullr) Fix Wind Touch damage in Unshadowed Haibram
-   (rectulo) Replace spell level with rank several spells and localized strings
-   (Rigo) Add upgrade notes and predicated bonuses to Nanite Surge
-   (stwlam) Change Overdrive damage choice set to toggle
-   (stwlam) Correct passive defense of attack spells targeting fortitude DC
-   (stwlam) Extend archer archetype feat support to weapons in crossbow group
-   (stwlam) Move overdrive fire damage to weapon innovation class feature
-   (stwlam) Remove class kits
-   (stwlam) Replace note on Sticky Bomb feat with flat modifier
-   (Tikael) Finish Psychic amp and spell modifications
-   (Tikael) Grant Deadly Simplicity with Warpriest's First Doctrine
-   (Tikael) Brush up automation of Enlarged Chassis and Scion Transformation

## 5.13.2

### Bugfixes

-   (stwlam) Disable flanking for GM-hidden tokens
-   (stwlam) Prevent unidentified scrolls and wands from appearing in spell activations subtab
-   (stwlam) Restore visiblity of manually-created items-only spellcasting entries
-   (stwlam) Restore action roll options when generating inline damage labels
-   (Supe) Prevent creation of new item casting entries on PCs
-   (Supe) Support spell variants with elemental traits for kinetic activation

### Data Updates

-   (Chas) Brushup Sheltering Slab rule element
-   (Dire Weasel) Add adamantine trait to Underworld Dragon claw attack
-   (Dire Weasel) Add healing links to Sacred Ground predicated on Divine Font type
-   (Dire Weasel) Replace lower-resolution system icons with identical core icons
-   (Dire Weasel) Update description and formatting of Potion of Disguise
-   (DocSchlock) Fix several feat max-takable values
-   (rectulo) Fix description of Mysterious Breadth
-   (Rigo) Add cursebound trait to spells cast while using Mystery Conduit
-   (Rigo) Add upgrade notes to Halfling Luck
-   (Rigo) Append aura shut off reminder note to overflow impulses
-   (Rigo) Brush up Vision of Weakness spell effect
-   (stwlam) Set primal tradition in Kinetic Activation spellcasting ability
-   (Tikael) Add missing Season of Ghosts actor

## 5.13.1

### System Improvements

-   (stwlam) Show worn scrolls/wands in activations subtab, add button to draw them if not already held

### Bugfixes

-   (stwlam) Fix moving items between actors, showing stowed option in carry-type menu
-   (stwlam) Subtract focus-point cost amount instead of always one when consuming points before casting

### Data Updates

-   (Dire Weasel) Add noisy to Ghoul Hide when worn by an elf
-   (DocSchlock) Add missing 1st Level Restrictions to some feats
-   (j-bs) Fix styling regression in Kingdom sheet sub-nav header
-   (Rigo) Automate Witch's Patron Familiar Ability notes upon casting a hex
-   (Rigo) Fix Deep Roots localized inline damage roll
-   (Rigo) Make some corrections to Blood Magic effect descriptions
-   (stwlam) Automate Kinetic Activation and Scroll Thaumaturgy

## 5.13.0

### Highlights

-   (nikolaj-a) Add support for experimental inline /act syntax for using actions
-   (Rigo) Automate Sorcerer Blood Magic notes
-   (Tikael) Start automating psychic amps

### System Improvements

-   (Dire Weasel) Add primary deity's divine font to roll options
-   (DocSchlock) Add `hideIfDisabled` field to DamageDice rule element
-   (j-bs) Add Defense line to spell-description prepends
-   (kromko) Add `target` property to action macro options that accepts either a token or actor
-   (MrPrimate) Add (default-disabled) bonus to Forceful weapons
-   (stwlam) Start adding support for physical-item attachments
-   (stwlam) Add support for item-description alterations
-   (stwlam) Propagate effect traits from damage rolls to persistent-damage conditions
-   (stwlam) Show activatable spell consumables in spellcasting tab
-   (stwlam) Add support for classifying languages as being unavailable for use
-   (Supe) Add defense column to actor-sheet spellcasting tabs
-   (Trent) Add roll options for spellcasting traditions
-   (xdy) Allows familiars to use their master's hero points to reroll checks

### Bugfixes

-   (Rigo) Fix localization errors in Compendium Browser settings tab
-   (stwlam) Prevent flanking highlighting from appearing for neutral actors
-   (stwlam) Don't factor in bulk when pricing precious-material shields
-   (stwlam) Fix aberrant rendering of innate spell collection and flexible preparation list
-   (stwlam) Fix spellcasting counteraction modifier for NPCs
-   (stwlam) Fix issue causing players to send messages as dead NPCs while in the process of looting them
-   (stwlam) Fix damage cues showing when Show Outcomes metagame setting is disabled
-   (stwlam) Restore foundry-style scrollbar appearance for Chrome 121
-   (Supe) Fix armor speed penalty applying twice to speeds derived from land speed
-   (Supe) Fix Elemental Blast button labels when statistic is affected by melee- or ranged-attack-roll modifiers
-   (Trent) Extract modifier adjustments for resilient rune modifier

### Data Updates

-   (Abaddon) Fix prerequisite for Uzunjati Storytelling and Named Artillery
-   (chazpls) Add effects for Magnetic Shot
-   (Dire Weasel) Add automation for Asmodeus' Moderate Boon divine font selection, Erraticannon damage, Froglegs' Knife Fighter, Rapid Response, Skinsaw Seamer's Flay
-   (Dire Weasel) Add burrow speed automation to Delve Scale effect
-   (Dire Weasel) Add effect for Chromatic Jellyfish Oil, Drowsy Sun Eye Drops, Energy Adaptive, Grudgestone, Iron Medallion, Merciful Charm, Rhino Hide Brooch, Sneaky Key, Swift Block Cabochon, Theatrical Mutagen, Tome of Restorative Cleansing, Vapor Sphere
-   (Dire Weasel) Add Experiment trait
-   (Dire Weasel) Add inline damage links to Bracers of Strength and Wolf Fang
-   (Dire Weasel) Add lighting automation for Ancient Scale Azarketi
-   (Dire Weasel) Add lighting automation for Midday Lantern
-   (Dire Weasel) Add Note REs with healing links for Communal Healing and Sap Life
-   (Dire Weasel) Add predicates to Divine Font choices
-   (Dire Weasel) Add rule elements to and single effect for Divine Infusion
-   (Dire Weasel) Add Size-Changing rune to system
-   (Dire Weasel) Add Sled and update remaster vehicles
-   (Dire Weasel) Add unified effects for Fungal Infestation and Swampcall
-   (Dire Weasel) Attach shield bosses to shields for pregen PCs
-   (Dire Weasel) Brush up some fist attack automation
-   (Dire Weasel) Fix description formatting for Versatile Font
-   (Dire Weasel) Fix duration of Instant Armor
-   (Dire Weasel) Fix effect name for Impenetrable Scale
-   (Dire Weasel) Fix Hannis Drelev's inline roll for Dramatic Disarm
-   (Dire Weasel) Fix Illusory Disguise's link to a macro
-   (Dire Weasel) Correct range of Boost Eidolon
-   (Dire Weasel) Fix traits on In the Shadows of Toil
-   (Dire Weasel) Fix typos in prerequisites for Energized Font
-   (Dire Weasel) Improve automation for Armag Twice-Born's Greatsword Critical Specialization
-   (Dire Weasel) Update Anchored effect to apply to reflex DC
-   (Dire Weasel) Update Armag Twice-Born's Awesome Blow to remove macro link
-   (Dire Weasel) Update automation for Divine Castigation to remaster and add automation for Castigating Weapon
-   (Dire Weasel) Update Critical Specialization strings to remaster
-   (Dire Weasel) Update Tanglefoot Bag effects to Glue Bomb for remaster
-   (DocSchlock) Add Chaotic Destiny Action to Crown of Chaos Background
-   (DocSchlock) Add Effects for Dragon's Eye Charm andSanguine Mutagen
-   (DocSchlock) Add Failure Note to Pernicious Spore Bomb
-   (DocSchlock) Add inline Performance Check to Lingering Composition
-   (DocSchlock) Add Missing Equipment Effects and cleanup Equipment automation
-   (DocSchlock) Add missing RE to Applereed Mutagen Greater Effect
-   (DocSchlock) Add REs and Effects to Ghost Hunter Dedication
-   (DocSchlock) Add some traits and inline links to Familiar Abilities
-   (DocSchlock) Add spell-description item alteration to Mystery Conduit
-   (DocSchlock) Add Spell Parry Effect and link from feat
-   (DocSchlock) Add Earn Income rule element to Tradecraft Tattoos
-   (DocSchlock) Add Vivielle Ramslay to Outlaws of Alkenstar Bestiary
-   (DocSchlock) Automate Grand Medic and Storyteller Mask Feats
-   (DocSchlock) Cleanup Eldritch Researcher feats, Starlight Armor description, and Risky Surgery
-   (DocSchlock) Fix Black Smilodon rarity
-   (DocSchlock) Link Effect to Crown of the Kobold King
-   (DocSchlock) Remove CRB Goblin Ancestry feats not reprinted
-   (Drental) Unify inline damage in Uthul Whirlwind Form
-   (j-bs) Add automation for the Resistance group of Familiar Abilities
-   (j-bs) Add rule elements for Tremorsense and Wavesense Familiar Abilities
-   (j-bs) Fix Blinding Foam base damage die size
-   (j-bs) Fix modifier type in Song of Strength effect
-   (j-bs) Fix size and attributes of Crysmal
-   (xdy) Change Kobold Breath and Dragon's Breath feats to roll area damage
-   (xdy) Change prerequisite ability scores to attribute modifiers in dedication feat descriptions
-   (kromko) Add description to Spell Effect: Bullhorn
-   (kromko) Add missing trigger to Air Bubble spell description
-   (kromko) Fix senses on Ghoul Antipaladin Kilia, Megalodon, Mwibo Teraphant, Vordakai, and Xotanispawn tremorsense
-   (LebombJames) Add effect for Crimson Shroud AC bonus
-   (MrVauxs) Fix Wraith having Aklo instead of Necril
-   (nikolaj-a) Add Affix a Talisman and Learn a Spell action macros
-   (nikolaj-a) Add missing action cost to demoralize action object
-   (nikolaj-a) Add support for providing a numeric difficulty class parameter on action use
-   (nikolaj-a) Favor action objects over old action functions for inline actions
-   (nikolaj-a) Improve accessibility for character sheet tabs
-   (nikolaj-a) Set multiple statistics for decipher writing and subsist actions
-   (nikolaj-a) Tighten up type for traits in action object
-   (nikolaj-a) Wire up identify alchemy and identify magic actions for item identification
-   (rectulo) Delete unnecessary effect in description for rhino-hide
-   (rectulo) Fix damage type of sansetsukon
-   (rectulo) Update composition trait and Occult Spellcasting class feature with PC1 text
-   (rectulo) Link spells in Studious Spells feature
-   (Reyzor) Fix sense details for several NPCs
-   (Rigo) Add effects for Animate Rope and Thoughtform Summoning
-   (Rigo) Add choice of imprecise sense to Magical Experiment background
-   (Rigo) Add darkvision subfeature to Visual Fidelity
-   (Rigo) Add effect for Pistolero's Challenge
-   (Rigo) Add predicated imprecise thoughtsense to Thoughtsense feat
-   (Rigo) Add rule elements to Diving Armor, Final Shot, and Reverse Engineer
-   (Rigo) Add scaling to Mountain Skin's armor proficiency
-   (Rigo) Add toggle to apply Bullet Split penalty
-   (Rigo) Append flat check note to spells under non-spellcaster Ancestral Curse
-   (Rigo) Append note to spells under moderate and major Curse of Outpouring Life
-   (Rigo) Automate Elemental Apotheosis
-   (Rigo) Add Oracular Curse severity notes when casting revelation spells
-   (Rigo) Automate Overdrive Ally
-   (Rigo) Automate Psychic feat spell alterations
-   (Rigo) Brush up Elemental Heart Dwarf heritage automation
-   (Rigo) Brush up Shillelagh's spell effect
-   (Rigo) Consolidate Blood Magic Effects
-   (Rigo) Fix damage and healing inline rolls on Flawed Ritual hazards
-   (Rigo) Fix Glorzia's level
-   (Rigo) Fix Kineticist Dedication wrongly granting Base Kinesis
-   (Rigo) Fix Stunning Finisher note
-   (Rigo) Fix Weapon Proficiency predicate
-   (Rigo) Improve Offensive Boost related automation and automate Variable Core
-   (Rigo) Narrow Remorseless Lash note to successful Strikes
-   (Rigo) Restrict Megaton Strike to qualifying Strikes
-   (Rigo) Fix Deep Freeze inline damage rolls
-   (Rigo) Fix Dragonscaled Kobold resistance
-   (stwlam) Add rule elements to Shadow Signet
-   (stwlam) Add shield spikes to Burr Shield
-   (stwlam) Correct bulk of Reinforced Stock, price of Major Oil of Potency, and rarity of long hammer
-   (stwlam) Fill automation gaps in Stance: Tenacious Stance
-   (stwlam) Move Mwangi regional languages from rare to uncommon
-   (stwlam) Spruce up rule elements for Megaton Strike and unstable actions
-   (Tikael) Fix stats of several PFS creatures
-   (Tikael) Fix usage of Clockwork Macuahuitl
-   (TMun) Add fire resistance to Numerian Steel Breastplate
-   (TMun) Correct Destructive Aura from cone to emanation
-   (Trent) Add rule for Divine Disharmony bonus

## 5.12.7

### Bugfixes

-   (jfn4th) Restore heightened signature spell background color
-   (stwlam) Hide speaker in encounter participant conditions message if applicable metagame setting is enabled
-   (stwlam) Fix issue causing crafting entries to prevent opening token configurations, with feeling this time

### Data Updates

-   (Dire Weasel) Add automation for Discordant Voice
-   (Dire Weasel) Add link to lower-level effect to Corpse-Killer's Defiance
-   (Dire Weasel) Remove one-time heal from Hymn of Healing
-   (Dire Weasel) Replace Facetbound Cascader's Aeon Stone (Orange Prism) effect links with Aeon Stone Resonance (Amplifying)
-   (DocSchlock) Add rule elements to Charming Liar and Eldritch Researcher Dedication
-   (DocSchlock) Improve Automation of Blood Ward
-   (nikolaj-a) Correct text of Identify Alchemy action object outcome notes
-   (Rigo) Restrict Basic Finisher to require Finishing Precision archetype feat
-   (rectulo) Fix description in Coerce and Earn Income actions

## 5.12.6

### System Improvements

-   (nikolaj-a) Add Identify Alchemy and Identify Magic action macros
-   (stwlam) Improve various aspects of GM vision

### Bugfixes

-   (Chromatic Penguin) Fix Browse Downtime Actions button on PC sheet
-   (stwlam) Fix display of stealth DCs on simple hazards
-   (stwlam) Fix default batch sizes created by most advanced alchemy features
-   (stwlam) Fix issue causing crafting entries to prevent opening token configurations

### Data Updates

-   (Abaddon) Restore note to Pugwampi senses
-   (Dire Weasel) Remove links to Earplugs effects in favor of REs on items themselves
-   (DocSchlock) Localize note on Strong-Blooded Dwarf Heritage
-   (j-bs) Update various text to use "counteract rank" terminology from Player/GM Core
-   (j-bs) Update Witch and Wizard class summary text to match Player Core
-   (rectulo) Fix level of Dig Up Secrets feat

## 5.12.5

### Bugfixes

-   (stwlam) Prevent long IWR lists on NPC sheets from overlapping
-   (stwlam) Fix restoring display value of hazard stealth DC after editing
-   (stwlam) Fix some types of ancestry features incorrectly giving darkvision
-   (stwlam) Fix quantities crafted using daily crafting abilities with variable batch sizes

### Data Updates

-   (Dire Weasel) Add links to effects from Vitrifying Blast and some Kingmaker NPC abilities
-   (Dire Weasel) Brush up Ghosts in the Storm, Polished Demon Horn
-   (DocSchlock) Add effect for Darkened Sight and unify effects for Traveler's Transit
-   (j-bs) Update Counteract page in GM Screen journal
-   (rectulo) Fix formatting in descriptions of Command an Animal and Maneuver in Flight actions
-   (Rigo) Add effect for Familiar of Keen Senses
-   (Rigo) Cap item level of Cauldron's crafting entry to character level

## 5.12.4

### System Improvements

-   (OmegaRogue) Add 500ms delay for drag-and-drop sort for touch devices

### Bugfixes

-   (jfn4th) Prevent erroneous triggering of sheet handlers
-   (stwlam) Add temporary measure to handle skill data preparation for PCs older than ~2 years
-   (stwlam) Add room to certain areas of spell collections on actor sheets to accommodate localized text

### Data Updates

-   (Dire Weasel) Add Darkwood and Mithral renames to Remaster Changes journal entry
-   (Dire Weasel) Add effects for Cyclonic Ascent, Everlight, Deity's Protection, Resounding Finale
-   (Dire Weasel) Add links to effects from Hymn Of Healing spell, Sairazul Blue potion
-   (Dire Weasel) Add missing traits to Execute's vitality overlay
-   (Dire Weasel) Fix description of Antimagic rune
-   (Dire Weasel) Remove traits overrides from Malicious Shadow spell overlays
-   (Dire Weasel) Update description for Light's spell effect to better match remaster
-   (DocSchlock) Add armor effects for Saurian Spike
-   (DocSchlock) Change Steam Knight Stance speed bonus type to status
-   (DocSchlock) Update Call on Ancient Blood to Remaster text
-   (rectulo) Fix description of swim action
-   (Rigo) Add effect for Familiar of Restored Spirit, aura effect for heightened Silence
-   (Rigo) Add Witch's Cauldron Crafting Entry

## 5.12.3

### Bugfixes

-   (stwlam) Add Versatile Mental as weapon trait
-   (stwlam) Fix display of free-action and reaction glyphs on spell-sheet header
-   (stwlam) Fix rendering of notes in rerolled check messages
-   (stwlam) Fix sidebar scrolling and skills editing on simple NPC sheet
-   (stwlam) Fix Unprepare Formula listener on PC sheet
-   (stwlam) Re-render PC sheet for all users viewing it upon resting for the night

### Data Updates

-   (CitySim) Fix transposed Dimension spells in remaster journal
-   (Dire Weasel) Limit display of roll notes from Death Warden Dwarf heritage to certain outcomes
-   (Dire Weasel) Add spell effect for Precious Metals
-   (Rigo) Update Death Warden Dwarf's note to remaster text

## 5.12.2

### Bugfixes

-   (jfn4th) Fix outdated low-light-vision value in ancestry sheet
-   (jfn4th) Prevent tall images from overlapping in compendium browser
-   (jfn4th) Fix styling error when PC sheet character has ancestries/heritages/backgrounds/classes with long names
-   (stwlam) Fix dropping formulas in PC sheet crafting tab
-   (stwlam) Fix issue causing error to be thrown when new spells or effects are created
-   (stwlam) Restore level data to template.json spell defaults
-   (stwlam) Run extractPacks all
-   (Supe) Fix spells with fixed heightening

### Data Updates

-   (Dharkus) Add effect for Defaced Nyad Queen's forgiveness, Forgive Foe
-   (Dharkus) Correct Phomandala's Focus Gaze DC
-   (Dire Weasel) Fix several errors in Tiger Form effect
-   (Dire Weasel) Fix Ghostly Weapon to apply only to selected weapon
-   (ditzer252) Fix typo in Critical Fumble Deck #51
-   (stwlam) Track how many times Multilingual has been taken, use with Gnome Polyglot/Nomadic Halfling
-   (stwlam) Update rule elements in Burn It! feat to match text in Player Core
-   (Tikael) Fix setting Champion class DC on Champion Dedication

## 5.12.1

### Bugfixes

-   (stwlam) Fix erroneous PC language slot calculation when a language is both manually and automatically added
-   (stwlam) Catch out-of-date scroll/wand data from adventure modules when migrating
-   (stwlam) Fix opening AC modifiers on PC sheet
-   (Supe) Restore display of stamina on character sheet

### Data Updates

-   (Intervención) Have Druid Dedication feat grant Wildsong language

## 5.12.0

### System Improvements

-   (nikolaj-a) Add Dismiss and Sustain actions from Player Core as macros
-   (nikolaj-a) Add Remaster changes to Create a Diversion, Disarm, Grapple, Make an Impression, and Shove action macros
-   (stwlam) Extend rules-based vision support to NPCs
-   (stwlam) Add metagame information setting to show or hide roll breakdowns to players (hidden by default)
-   (stwlam) Add trio of "subfeatures" for simpler automation in feats. This comes with removal of directly editing certain proficiency ranks.
-   (stwlam) Classify languages according to rarity, add campaign/homebrew settings to adjust them
-   (stwlam) Track language slots on PCs
-   (stwlam) Treat damage rolls directly inputted into chat as being either damage or healing
-   (Supe) Update style of several areas of PC sheet, including languages, speeds, and traits
-   (Supe) Add button to create bonus Feat on PC sheet
-   (Supe) Add rule element form for actor traits
-   (Supe) Allow non-Kingmaker worlds to enable kingdom and army sheets
-   (Supe) Automate kingdom army consumption and add consumption breakdown
-   (Supe) Extend Apex support to most physical items
-   (Supe) Make modifiers in PC-sheet sidebar clickable to open tooltip
-   (Supe) Relax "equipped" check for invested non-worn items, allowing held invested items to be worn and maintain their investment
-   (Supe) Allow use of `@kingdom` in rule element resolving
-   (Tikael) Allow for user-defined cone angles in HTML inline templates

### Bugfixes

-   (Dire Weasel) Remove context menu option to set initiative
-   (nikolaj-a) Align header of action chat cards to consistently show action glyph in the same place
-   (stwlam) Prevent neutral combatants from aiding in flanking
-   (stwlam) Fix issue that prevents predicated Sense rule elements from functioning
-   (stwlam) Fix price calculations of non-magical items composed of special materials
-   (stwlam) Fix editing items-only spellcasting entries from NPC sheets
-   (Supe) Fix statistic used to make attack rolls and set saving throw DC of scroll/wand spells
-   (Supe) Fix converting selector to array for fresh Flat Modifier forms

### Data Updates

-   (Abaddon) Add inline damage links to Extract Element, Mercurial Stride, Murderous Vine, and Rust Cloud
-   (Abaddon) Fix frequency for Flowering Path
-   (axchow) Fix armor proficiency granted by Ruffian Rogue class feature
-   (Avagdu) Fix grammar errors in descriptions of Bon Mot Effects
-   (Cerapter) Update Witch lessons to use tags for easier third-party inclusion
-   (Chas) Brushup Scholarly Defense rule elements
-   (Dire Weasel) Add automation for Dragon Shape resistance
-   (Dire Weasel) Add bludgeoning, piercing, slashing, spirit overlays to Spiritual Armament
-   (Dire Weasel) Add effect for (Affinity Ablaze) Biting Roses: Glimpses to Beyond
-   (Dire Weasel) Add effect for Energy Ablation
-   (Dire Weasel) Add fire resist to Elemental Wayfinder (Fire)
-   (Dire Weasel) Add missing baseType to several claw and jaws Strike REs
-   (Dire Weasel) Add Note RE with damage link for Cremate Undead
-   (Dire Weasel) Add resistance effect for Magic's Vessel
-   (Dire Weasel) Add spell effects for Bind Undead (and update to Remaster text) and Ill Omen
-   (Dire Weasel) Add swim action roll option to Aqueous Orb's inline check and add link to Escape action
-   (Dire Weasel) Add toggle and trait automation for Toppling Dance
-   (Dire Weasel) Automate resistance for Sacred Defender
-   (Dire Weasel) Brush up automation for Cut from the Air
-   (Dire Weasel) Clean up descriptions and formatting of Mage's Hats, some Inventor feats
-   (Dire Weasel) Fix Arctic Rift fortitude save to be non-basic
-   (Dire Weasel) Fix effect for Resurrectionist
-   (Dire Weasel) Fix predicate for rule element in Beast Speaker
-   (Dire Weasel) Fix Primal Bandersnatch damage
-   (Dire Weasel) Fix usage of Ghost Touch rune for remaster
-   (Dire Weasel) Update effect for Scout's Warning to remove after roll
-   (Dire Weasel) Update Long Jump with Player Core errata
-   (Dire Weasel) Update Purifying Icicle to deal extra vitality damage only against undead
-   (Dire Weasel) Update Rejuvenating Flames healing link to autoleveling
-   (Dire Weasel) Add automation for Jann's Prism
-   (Dire Weasel) Mark many inline healing links across compendium items as actually being healing
-   (DocSchlock) Add automation to Golem Grafter Archetype
-   (DocSchlock) Add Effect for Ocean's Balm
-   (DocSchlock) Add Holy and correct duration to Amplifying Touch Effect
-   (DocSchlock) Add more self-applied effects and granted actions to Feats
-   (DocSchlock) Prevent Bravery class feature from always showing roll note regardless of roll outcome
-   (DocSchlock) Add rule elements for Staff of Healing bonus HP
-   (DocSchlock) Add Spellcasting Proficiency to more Feats
-   (DocSchlock) Add Sustain an Effect Exploration Activity
-   (DocSchlock) Add two missing abilities to Siabrae NPC
-   (DocSchlock) Add wood and metal options to Elementalist Dedication effect
-   (DocSchlock) Change Basic Witchcraft to provide 3 familiar abilities per PC1
-   (DocSchlock) Change Litany of Depravity's target per the remaster errata
-   (DocSchlock) Change prerequisite ability scores to attribute modifiers on feats
-   (DocSchlock) Change Runic Mindsmith feats to the remaster runes
-   (DocSchlock) Convert sense rule elements to subfeatures on Feats
-   (DocSchlock) Convert several mentions of "ability score" and "spell level" to "attribute modifier" and "spell rank", respectively
-   (DocSchlock) Fix Deadly Hair Feat to apply to Living Hair
-   (DocSchlock) Fix error in Dragon Disciple journal entry page
-   (DocSchlock) Fix Eternal Wings and add fly speed to Hero's and Mighty Wings
-   (DocSchlock) Fix formatting error in Grapple action description and Ferrofluid items
-   (DocSchlock) Fix Glamorous Buckler's rules and remove unneeded effect
-   (DocSchlock) Fix labels for Fury Cocktail
-   (DocSchlock) Fix Llorona's Wail to use @Template
-   (DocSchlock) Fix missing spells in Arboreals and Canopy Elder
-   (DocSchlock) Fix Multishot Stance's prerequisite feat
-   (DocSchlock) Fix reference in Shared Assault
-   (DocSchlock) Fix sanctification options and domains on some Rage of Elements deities
-   (DocSchlock) Update class journals entries with text from Player Core
-   (DocSchlock) Update Weapon Proficiency feat with rules from Player Core
-   (Drental) Fix issue causing removal of death overlay icon to occasionally throw errors
-   (InfamousSky) Add many wand and weapon icons
-   (Intervención) Fix predicate of Constant Levitation feat
-   (Intervención) Update Nudge Fate to reflect stat block in Player Core
-   (jfn4th) Fix level of Ranger's Perception Legend feature
-   (xdy) Automate the Sprite ancestry feature Magical Strikes
-   (LebombJames) Add self-applied effect to Take Cover ability item
-   (rectulo) Fix errors in descriptions of Commune spell, Magic Sense feat, and Spiritual Guardian
-   (Rigo) Add `area-damage` roll option to class feats inline Damage rolls
-   (Rigo) Add effect for Familiar of Balanced Luck
-   (Rigo) Add level to Hilllock Halfling's healing received from Treat Wounds
-   (Rigo) Add Magic Item Mastery spellcasting to Seugathi NPCs and refresh spells
-   (Rigo) Add reposition to GM Screen skill action page
-   (Rigo) Add spell effect for Earthquake's shaking ground
-   (Rigo) Brush up Vine Leshy's climb automation
-   (Rigo) Have the Aid effect expire on use
-   (Rigo) Link spell effect in Touch of Corruption
-   (Rigo) Rename Savant's Curse to Sage's Curse and add spell effects
-   (Rigo) Replace Ki Form's lawful damage with spirit
-   (Rigo) Update seedpod's range increment to remaster
-   (stwlam) Rename Ifrit heritage to "Naari"
-   (stwlam) Fix level of Coven Spell feat
-   (stwlam) Correct rarity of standard/greater Staves of the Unblinking Eye
-   (stwlam) Remove legacy magical-school-based staves
-   (stwlam) Have Multilingual feat add language slots
-   (Tikael) Add Dense Plating to Breakthrough Innovation choices
-   (Tikael) Add inline link for Impersonate in Versatile Performance
-   (Tikael) Add inline save to Extract Elements
-   (Tikael) Clean up most NPC aura descriptions
-   (TMun) Add NPCs from PFS Quest 16
-   (TMun) Allow Order Explorer to grant order feat automatically for dedication
-   (TMun) Convert Thousand Blade Thesis to container
-   (TMun) Fix the description of Greater Crafter's Eyepiece
-   (TMun) Rename Human heritages for Remaster
-   (TMun) Update Ruffian rule elements for martial d6 critical specialization

## 5.11.5

### Bugfixes

-   (nikolaj-a) Add remaster changes to climb, force open, and swim action macros
-   (stwlam) Fix creation of fixed-heightening damage data
-   (stwlam) Keep rule-element-carrying ammunition linked to weapons even at zero quantity
-   (stwlam) Remove second application of strike-damage modifier adjustments
-   (stwlam) Set actor signatures after data model initialization

### Data Updates

-   (Abaddon) Fix prerequisite in reverberating spell
-   (AFigureOfBlue) Fix land speed of Tiger Form effect
-   (Dire Weasel) Add effect for Wish for Luck
-   (Dire Weasel) Add Reflex defense to Whirlpool
-   (Dire Weasel) Replace lower-resolution system icons with identical core icons
-   (Dire Weasel) Update Pillar of Water description to text found in Rage of Elements
-   (Dire Weasel) Update Witch's Armaments to PC1 version
-   (DocSchlock) Add effects for Fury Cocktail
-   (Manni) Fix "yellow" result in Rainbow Fumarole spell

## 5.11.4

### Bugfixes

-   (stwlam) Fix dropping items into closed containers
-   (stwlam) Fix deducting uses from non-auto-destroy items
-   (stwlam) Fix tagging consumable formulas that contain arithmetic as healing

## Data Updates

-   (Dire Weasel) Add burst to Dispelling Globe
-   (Dire Weasel) Change some Panache links to point to the effect rather than the feature
-   (DocSchlock) Add Keep Stone Ingot and Chunk
-   (DocSchlock) Change Precise Debilitations effect to expire at end of turn
-   (DocSchlock) Fix Liberator Edicts and Anathemas
-   (DocSchlock) Fix positioning of effects in Methodical Debilitations Feat
-   (stwlam) Fix definition of unholy IWR

## 5.11.3

### Bugfixes

-   (stwlam) Fix ammo listeners on attack popouts
-   (stwlam) Fix using wands from actor sheets and recharging on rest
-   (stwlam) Fix displayed rune slots in armor/weapon sheets with ABP enabled
-   (stwlam) Fix moving items into/out of containers

### Data Updates

-   (Dire Weasel) Fix action cost of Vengeful Spirit Deck and autolevel damage links
-   (stwlam) Fix choice set on Bespell Strikes effect

## 5.11.2

### System Improvements

-   (stwlam) Convert edicts and anathema on PC sheets to lists

### Bugfixes

-   (Dire Weasel) Allow check DCs to resolve for items with no actors
-   (stwlam) Fix application of handwrap runes to synthetic unarmed attacks
-   (stwlam) Fix inventory looting by players
-   (Supe) Fix display of wand charges in inventory
-   (Supe) Fix invalid spacing in journals created with prosemirror
-   (Supe) Mark fast healing/regen as healing
-   (Supe) Include spell tradition trait in roll options

### Data Updates

-   (Dire Weasel) Fix Ash Mystery predicate
-   (Dire Weasel) Fix Cornucopia's "Consume all produce" link to be healing
-   (Dire Weasel) Fix token name of Narlmarch Hunters
-   (Dire Weasel) Update condition descriptions to remaster text
-   (Dire Weasel) Add Druidic -> Wildsong to Remaster Changes journal entry
-   (stwlam) Fix bulk of coins
-   (Tikael) Fix spell attack of Wood Giant
-   (TMun) Update gouging claw damage for remaster

## 5.11.1

### Bugfixes

-   (stwlam) Restore NPC attack generation
-   (stwlam) Fix selectability of weapon and armor property runes
-   (stwlam) Show clumsy condition when wielding oversized weapons
-   (Supe) Fix certain innate spells being stuck at null uses
-   (Supe) Fix inventory drag/drop to tokens and other sheets

### Data Updates

-   (Ajulex) Add effect for Entropic Wheel
-   (Dire Weasel) Add effect for Heroes' Feast

## 5.11.0

### System Improvements

-   (Supe, Cora) Add army actors
-   (Drental) Update Gang Up flanking rule for Remaster

### Bugfixes

-   (Deatrathias) Don't set turn value before encounter start
-   (Dire Weasel) Fix Treat Wounds macro warning to emit correct missing skill name
-   (stwlam) Avoid declaring massive damage against actors with zero max hit points
-   (stwlam) Fix determination of whether critical hits immunity applies
-   (stwlam) Restore "Use" button in item summaries for consumables lacking formulas

### Data Updates

-   (Abaddon) Add ammunition type to spellstrike ammunition
-   (Abaddon) Fix damage formula in cryomister
-   (Dire Weasel) Add automation for Armored Skirt, Fey Influence, and Fey Ascension
-   (Dire Weasel) Add Boots of Speed to remaster journal entry
-   (Dire Weasel) Add effect for Elemental Betrayal, Forgefather's Seal, Shimmering Dust, Stoke the Fervent, Watch Your Back
-   (Dire Weasel) Add inline damage link to Twist the Knife
-   (Dire Weasel) Add token light rule element to Wand of Dazzling Rays
-   (Dire Weasel) Add unified effect for Shifting Form
-   (Dire Weasel) Fix fire weakness of Misbegotten Troll and improve Vicious Ranseur automation
-   (Dire Weasel) Fix level and price of Greater Astral rune
-   (Dire Weasel) Update rule elements on Sapling Shields
-   (Dire Weasel) Fix source of Rewrite Memory
-   (Dire Weasel) Fix traits and action cost of In Tune
-   (Dire Weasel) Update deafened and stupefied descriptions to PC1 text
-   (Dire Weasel) Update Divine Wings to be a self-applied effect
-   (Dire Weasel) Update Sunburst description to remaster and add auto-heightening vitality damage link
-   (Dire Weasel) Upgrade favored weapon proficiency to master in Warpriest's Final Doctrine
-   (Dire Weasel) Use system description for Note for Know-It-All (Bard) and add outcomes
-   (Drental) Fix the Athletics modifier rule element on Trip and Tangle
-   (Intervención) Remove "manipulate" trait from Conceal Spell feat
-   (LebombJames) Limit Ash Mystery benefit to Oracle class only
-   (pedrogrullada) Remove erroneous attack traits from some spells
-   (rectulo) Add Arcane tradition to Noise Blast spell
-   (Robert Beilich) Update traits of specific weapons
-   (sirrus233 ) Update Puff of Poison with Remaster errata
-   (Tikael) Add automation to Ancestral Longevity and similar feats.
-   (Tikael) Brush up automation of Paladin oath feats
-   (Tikael) Clean up darkvision elixir effects

## 5.10.5

### Bugfixes

-   (stwlam) Fix creation of tags for damage rolls that include ghost touch effect

## 5.10.4

### System Improvements

-   (Drental) Integrate new Magic Hands rules into Treat Wounds macro
-   (stwlam) Add support for persistent-damage resistance/weakness, resistance to critical hits

### Bugfixes

-   (stwlam) Declare containers over capacity only when over 100% full in Bulk units
-   (stwlam) Fix issue causing PC strike popouts to fail to open
-   (stwlam) Prevent multiple instances of persistent damage of a common type to roll damage
-   (stwlam) Fix targeting hazards with spell attacks and skill checks
-   (stwlam) Fix issue preventing battle forms from using a PC's own attack modifier if higher
-   (stwlam) Fix processing of critical hits immunity
-   (Supe) Fix kingdom feat slot drag/drop
-   (Supe) Fix RE form not reverting to base form type when the RE key changes

### Data Updates

-   (Abaddon) Include ammunition type in descriptions of ghost and penetrating ammunition
-   (Abaddon) Fix malformed HTML in descriptions of arsenic, beacon shot, explosive ammunition
-   (azrazalea) Add edicts and anathema formatted text fields to actor bio
-   (Daniel-V) Add strength modifier addition/upgrade to Assume Earth's Mantle stance
-   (Dire Weasel) Add automation for Horns of Naraga, Sacred Armaments, and (zombie abilities) Unholy Speed and Unkillable
-   (Dire Weasel) Add effects for Ash Form, Forcible Energy, Oil of Keen Edges, and Undying Ferocity
-   (Dire Weasel) Add token light to Vine of Roses
-   (Dire Weasel) Add spell link to Medusa's Scream and clean up description
-   (Dire Weasel) Fix immunities and resistances of Titanic Flytrap
-   (Dire Weasel) Fix inline roll for Brutal Bully and Overpowering Charge and emit note on critical success
-   (Dire Weasel) Fix Stealth DC and add trap trait to Rusty Grate Pit
-   (Dire Weasel) Update Monstrosity Form for remaster
-   (Dire Weasel) Brush up automation for Axe of the Dwarven Lords
-   (GorgoPrimus) Update Lamashtu deity with new description from PC1
-   (InfamousSky) Fix Einherji shield HP
-   (j-bs) Update Heal Animal spell with new description from PC1
-   (rectulo) Change prerequisites in Garland spell
-   (stwlam) Add decaying and raiment to property rune options
-   (stwlam) Lower intensity of Latern of Empty Light's token light RE
-   (stwlam) Migrate instances of "undercommon" to "sakvroth"
-   (stwlam) Remove Aligned Oil, Axiomatic & Anarchic rune items
-   (stwlam) Relax predicates on runes targeting undead to affect anything with void healing
-   (Tikael) Update implementation of Rogue debilitations, add effect or precise debilitations

## 5.10.3

### Bugfixes

-   (stwlam) Use base hardness/max HP of specific magic shields if higher than values provided by precious materials
-   (stwlam) Prevent automatic adjustments of bulk and size from saving upon closing item sheets

### Data Updates

-   (Dire Weasel) Fix consumable type of Penetrating Ammunition and automate bleed
-   (Dire Weasel) Fix bulk and usage of Druid's Crown
-   (stwlam) Fix precious material of Indestructible Shield

## 5.10.2

### Bugfixes

-   (stwlam) Fix determination of whether containers can ignore bulk
-   (stwlam) Fix excessive grid-snapping for some measured template types
-   (stwlam) Restore AC bonus and speed penalty fields in armor sheets

### Data Updates

-   (avagdu) Fix broken action macro link in Disarm Action
-   (avagdu) Refresh Rations on Level 1 Kyra
-   (avagdu) Update Many Action Macros with Remaster Text
-   (Dire Weasel) Add effect for Staff of Illumination
-   (Dire Weasel) Add resistance to Aeon Stone (Preserving)
-   (stwlam) Ensure some physical-item data is numeric
-   (stwlam) Fix bulk of Spacious Pouches
-   (stwlam) Fix rule element on Emblazon Armament (Shield) effect

## 5.10.1

Note: The system now requires a minimum Foundry version of 11.311.

### Bugfixes

-   (stwlam) Fix handling of "ignored" bulk, such as from backpacks and spacious pouches

## 5.10.0

### System Improvements

-   (In3luki) Snap burst templates to grid intersections
-   (stwlam) Add shield item type, migrate armor shields to shield shields
-   (Supe) Set party alliance based on contained members

### Bugfixes

-   (azrazalea) Fix adding kits to PCs
-   (In3luki) Fix setting visibility on the `RollNoteForm`
-   (nikolaj-a) Fix scroll and wand trick magic item skill selection from spell tradition
-   (stwlam) Preserve spells in scrolls/wands when refreshing from compendium
-   (Supe) Fix issue causing poor performance in worlds with large numbers of linked tokens

### Data Updates

-   (AFigureOfBlue) Fix Untamed Shift effect heightening
-   (avagdu) Add Astral and Greater Astral runes
-   (avagdu) Rename Disrupting Rune to Vitalizing Rune
-   (avagdu) Restore links to macros in Acrobatics and Athletics
-   (avagdu) Update descriptions of basic and skill actions to Remaster rules
-   (avagdu) Fix usage of Morphing Weapon
-   (Dire Weasel) Add automation for Challenge Foe, Elder Sphinx's Guardian Monolith Hardness, Forager, Ghost Ammunition, Serithtial, Sprite's Luminous Fire
-   (Dire Weasel) Add effects for Aeon Stone (Sprouting), Heart of the Kaiju, Potion of Emergency Escape, Shrinking potions, Spirit Guide Form, Worm Form, Life-Saver Mail, Moonlit Chain
-   (Dire Weasel) Add Potion of Expeditious Retreat to Remaster changes journal entry
-   (Dire Weasel) Brush up descriptions of Premonition of Avoidance, Premonition of Clarity, Shared Avoidance, Shared Clarity
-   (Dire Weasel) Fix action cost and description for Spirit Guide Form
-   (Dire Weasel) Fix description formatting for Aeon Stone (Pearly White Spindle)
-   (Dire Weasel) Fix rules elements in Flames Oracle and Untamed Order
-   (Dire Weasel) Fix Speaker Of Svaryr's regeneration and fix attack traits
-   (Dire Weasel) Fix usage of and bulk of several aeon stones
-   (Dire Weasel) Remove Greater Resolve class feature from Bard class
-   (Dire Weasel) Update Sun Blade to include variants and automate spirit and vitality damage
-   (Drental) Link automatically granted spells in Composition Spells class feature
-   (InfamousSky) Fix traits of Furious Focus
-   (InfamousSky) Remove channel smite prerequisite
-   (Intervención) Fix rule element on Rogue Resilience note selector
-   (Intervención) Fix Staves of Elemental Power's Frostbite
-   (intrand) Use magnifying glass icon in empty A(H)BCD fields on PC sheet
-   (j-bs) Add links to some Swashbuckler class features
-   (j-bs) Fix recently adjusted container bulk localisation strings
-   (LebombJames) Fix Divine Health Predicate and add DoS adjustment
-   (rectulo) Fix variants of Execute
-   (S-North) Update Administer First Aid and Refocus action remaster text
-   (shemetz) Remove initial value from damage/healing adjustment dialog
-   (stwlam) Add Ring of Energy Resistance rename to Remaster Changes journal entry
-   (stwlam) Include conditional cumulative resistance in Thermal Nimbus effects
-   (stwlam) Upgrade martial proficiency to expert in Warpriest's Third Doctrine
-   (Tikael) Add missing inline check to Scholar's Bane
-   (Tikael) Fix Psychic class's Clarity of Focus class feature
-   (Tikael) Restore Baba Yaga and Mosquito Witch patrons

## 5.9.5

### System Improvements

-   (stwlam) Add "Refresh from Compendium" button to sheets of owned items
-   (stwlam) Include a "healing" domain for healing spells
-   (stwlam) Prominently display spell details alongside descriptions

### Bugfixes

-   (azrazalea) Prevent granted heritages from overriding PCs' main heritages
-   (shemetz) Restore presence of counteractions rollable from some spell chat cards
-   (stwlam) Reinclude AC bonus from potency rune following override-mode item alterations

### Data Updates

-   (Dire Weasel) Add effect for Bespell Strikes
-   (Dire Weasel) Clean up some enriched HTML
-   (Dire Weasel) Fix path to icon of Animal Instinct tongue attack
-   (Dire Weasel) Fix unholy champion reaction damage and include auto-heightening damage links
-   (Dire Weasel) Unify Worm's Feast damage links and auto-heighten
-   (Intervención) Update Inventor Feat to PC1 text
-   (Minniehajj) Update divine font note in Cleric class journal entry page
-   (stwlam) Add rows for removed LO:AG lineage feats to Remaster Changes journal entry
-   (stwlam) Localize prompt in Unified Magical Theory choice set
-   (stwlam) Migrate "hb\_"-prefixed homebrew tags occurring in middle of strings
-   (stwlam) Update old copies of Lay on Hands and Touch of Corruption
-   (stwlam) Update text of Recall Knowledge action
-   (Tikael) Add automation to Ravening's Desperation

## 5.9.4

### System Improvements

-   (Supe) Add melee/ranged and damage type to elemental blast roll options

### Bugfixes

-   (stwlam) Fix rolling damage from scrolls and wands
-   (stwlam) Fix auto-encumbered not granting Clumsy 1
-   (Supe) Fix aura rendering when the active scene is updated

### Data Updates

-   (avagdu) Update level-1 Ezren, Feiya, Harsk, Kyra, Lem, Lini, Merisiel, and Valeros using remastered iconics
-   (avagdu) Add Witch Patron Familiar Abilities
-   (avagdu) Fix rule elements on Champion's Code to not add both Holy and Unholy when selecting a deity that allows either sanctification
-   (avagdu) Allow Additional Lore to be Selected Multiple Times
-   (avagdu) Add Spellcasting and Bounded Spellcasting Archetypes Journals, link Journal Entries to Spellcasting Archetype Feats
-   (avagdu) Change Blade Brake to a reaction
-   (avagdu) Convert Dragon Form effects to remaster rules
-   (avagdu) Correct Channeling Block level and Mark Others as Remastered
-   (avagdu) Fix rule elements on Everstand Stance Effect to Increase Hardness and Nephilim Resistance
-   (avagdu) Grant Pet feat from Witch Familiar Feature and Familiar Feat
-   (avagdu) Restore Paladin rule elements to Shining Oath
-   (Dana) Add reminder note and effect to Tactician's Helm
-   (Dire Weasel) Add attack trait to Reposition, remove attack trait from Spy's Mark spell
-   (Dire Weasel) Add automation for Divine Rebuttal and Stance: Masquerade of Seasons Stance, and Ovinnik's Raise Grain Cloud extra fire resistance
-   (Dire Weasel) Add Communal Crafting and Unusual Treatment feats
-   (Dire Weasel) Add effects for Raise Symbol, Restorative Strike, Mantle of the Unwavering Heart
-   (Dire Weasel) Add Subtle trait to Charm, Invisibility, and Subconscious Suggestion
-   (Dire Weasel) Add toggle to Swaggering Initiative
-   (Dire Weasel) Fix damage type of Debilitating Dichotomy
-   (Dire Weasel) Fix description of Kneecap effect
-   (Dire Weasel) Update Elemental Shape to use new unified Spell Effect: Elemental Form
-   (Dire Weasel) Fix hardness and HP of Indestructible Shield
-   (Dire Weasel) Fix level of Words of Unraveling
-   (Dire Weasel) Fix Tok Loyalist's Crafting traps variant label
-   (Dire Weasel) Improve automation of Scamper Underfoot and Titan Slinger
-   (Dire Weasel) Make Antipaladin and Ghoul Antipaladin strikes unholy
-   (Dire Weasel) Refresh Kangir's Unburdened Iron
-   (Dire Weasel) Update Book of Warding Prayers to grant resistance to holy or unholy
-   (j-bs) Update Disarm description to match remaster text
-   (j-bs) Update Litany against Wrath description to match errata text
-   (kakesu) Add Goggles of Night to list of renamed equipment from the remaster
-   (kakesu) Add links to weapon names in Elven Weapon Familiarity feat
-   (Minniehajj) Fix dragon sorcerer bloodlines and dragon disciple interaction
-   (Minniehajj) Update the copy within the compedium for Divine Font's remaster changes
-   (nikolaj-a) Fix maximum craftable item level for snarecrafter dedication
-   (rinaldaj) Fix Witches Armaments not adding the selected strike to character sheet
-   (stwlam) Fix traits and defenses of spells with variants
-   (stwlam) Have Animal Accomplice and Leshy Familiar feats grant Pet feat
-   (stwlam) Have Cleric Dedication grant Deity class feature
-   (stwlam) Limit Courageous Anthem's check bonus to attack rolls
-   (stwlam) Set default opposing statistic in Perform action to Will DC
-   (Tikael) Add Aiuvaran and Dromaar to remaster changes journal
-   (Tikael) Add automation to Channel Protection Amulet
-   (Tikael) Improve automation for granting champion reactions

## 5.9.3

### Bugfixes

-   (stwlam) Fix precious material select menu on armor & weapon sheets
-   (stwlam) Prevent long A(H)BC names from causing overflow on PC sheet
-   (stwlam) Fix raised-shield status in actor shield data

### Data Updates

-   (Dire Weasel) Add inline damage roll to Grim Ring
-   (Dire Weasel) Fix predicates based on wild shape
-   (Dire Weasel) Fix some mentions of Positive and Negative
-   (stwlam) Add Aura RE to Aura of Faith, update predicates on extra damage
-   (stwlam) Add description for Summon trait
-   (stwlam) Remove addition of spellcasting mod to Shadow Illusion and Weapon of Judgment damage
-   (stwlam) Remove spell "Lay on Hands (Vs. Undead)", redirect links to it to Lay on Hands
-   (Tikael) Clean up NPC antipaladin and demonologist
-   (TMun) Update witch and wizard descriptions in Classes journal entry to latest text from _Player Core_

## 5.9.2

### Bugfixes

-   (In3luki) Migrate non-boolean `adjustName` values in choice set rule elements
-   (stwlam) Confirm a damage recipients are at 0 hp before possibly pronouncing instant death
-   (stwlam) Fix aberrant positioning deity section on PC sheets
-   (stwlam) Link up holy/unholy traits with immunities/weaknesses/resistances
-   (Supe) Prevent duplicate phantom aura textures
-   (Supe) Allow category-less custom damage types from modules
-   (Supe) Fix spellcasting proficiency increases from rule elements

### Data Updates

-   (avagdu) Update Range on Divine Lance
-   (dellatorreadrian) Add Atone ritual link in Druid Anathema description
-   (dellatorreadrian) Add/Update Familiar Abilities from Remaster
-   (dellatorreadrian) Rename Hearing to Echolocation in Batsbreath Cane Effect
-   (Dire Weasel) Add arcane to Mindlink traditions
-   (Dire Weasel) Add automation for Dark Deliverance bestiary abilities
-   (Dire Weasel) Fix Initiate Warden's link to Heal Companion
-   (Dire Weasel) Fix traits for Clear Mind
-   (Dire Weasel) Update damage links in Shed Spirit and Stitching Strike to autolevel
-   (Dire Weasel) Update Spellmaster's Ward with autoheightening roll link
-   (Intervención) Add link Untamed Form spell from feat, remove level restriction
-   (Intervención) Correct Cleanse Affliction rank
-   (Intervención) Correct Sure Footing spell link on Remaster Journal
-   (Intervención) Fix Untamed Shape precidate
-   (Intervención) Remove identify bonus from Staff of the Dead
-   (Intervención) Update Rogue Resilience to upgrade Fortitude instead of Reflex
-   (stwlam) Add Holy trait to Holy Light and Moonlight Ray spells
-   (stwlam) Fix filter in Experimental Spellshaping choice set
-   (stwlam) Include Subtle trait description in config/traits
-   (stwlam) Remove "hb\_" prefix in tags among homebrew settings
-   (stwlam) Remove sanctification options from Gozreh
-   (stwlam) Update description of Arcane Cascade action item, standard cantrips of Oscillating Wave class feature
-   (Supe) Automatically remove Monster Hunter effect after rolling

## 5.9.1

### Bugfixes

-   (stwlam) Fix regressions in some deity sheet fields
-   (stwlam) Fix issue creating display errors in some IWR labels
-   (stwlam) Fix issue preventing bestiary browser from being populated

### Data Updates

-   (kromko) Fix Unholy damage type label in IWR
-   (stwlam) Add Witch's Broom feat
-   (stwlam) Update Ruffian sneak attack rule element to PC1
-   (stwlam) Replace Druidic language with Wildsong
-   (stwlam) Replace non-feat mentions of "Attack of Opportunity" with "Reactive Strike"
-   (stwlam) Fix rank of Spiritual Armament spell
-   (stwlam) Set all classes to start with trained class DCs

## 5.9.0

### Highlights

-   (Ambrose M., Darkblade1983, Dire Weasel, dogstarrb, Ethan, Intervención, Mecha Maya, MiraculousWaterBottle, nikolaj-a, stwlam, Supe, Tikael) Do a remaster dance

### System Improvements

-   (azrazalea, stwlam) Improve narrowing of spell categories in compendium browser when opened from creature sheets
-   (Cerapter) Add `none` group to rollOptions for weapons and armour without groups
-   (Cerapter) Allow frequency ItemAlterations (`max` and `per`) to alter items without a frequency
-   (stwlam) Add support for using token marks on origins
-   (stwlam) Automatically create versatile weapon traits from homebrew damage types
-   (stwlam) Hide "Place Measured Template" buttons on aura spells
-   (stwlam) Nag about non-V11-compatible modules
-   (stwlam) Show RE validation failures in rules panel of item sheets
-   (Supe) Add support for null category in homebrew damage types
-   (Supe) Support dragdrop of inline @Damage persistent damage

### Bugfixes

-   (stwlam) Fix roll inspector attempting to localize dice as modifiers
-   (stwlam) Fix tooltips in strike summaries and action macro cards
-   (stwlam) Refrain from tagging Treat Wounds critical failures as healing rolls
-   (Supe) Don't mark an inline damage roll as heightened if there is no actor
-   (Supe) Fix custom damage deletions and propagate to players
-   (Supe) Fix long party names making buttons on party folder interface inaccessible

### Data Updates

-   (dellatorreadrian) Add emanation to Final Sacrifice
-   (dellatorreadrian) Add missing RE to Feral Child
-   (dellatorreadrian) Change save from Confront Selves to Basic
-   (dellatorreadrian) Create Spirit Sense Spell Effect
-   (dellatorreadrian) Fix missing RE on Skinstich Salve
-   (Dire Weasel) Add automation for Arboreal Snag (Axan Wood)'s Blood Roots, Chaplain's Cudgel and Fighter's Fork, Pleroma's Energy Touch
-   (Dire Weasel) Add automation to Hunter's Anthem for thundering rune with Hunt Prey
-   (Dire Weasel) Add ChoiceSet to Beast Trainer
-   (Dire Weasel) Add damage automation for Tino Tung's Retributive Strike
-   (Dire Weasel) Add effect for Alloy Orb, Clawed Bracers, Deep Sight, Force Shield, Forge Warden, Glow Rod, Horn of Exorcism (Sacred Seeds), Protector's Sphere, Raise Menhir, Sanctify Armament, Sun's Fury
-   (Dire Weasel) Add Floating Spores ability to Poisonous Mold
-   (Dire Weasel) Add light to Celestial Armor effect
-   (Dire Weasel) Unify effects for Elemental Form, Primal Summons, and Sweet Dream
-   (Dire Weasel) Brush up Ardent Armiger and Humbug Pocket automation
-   (Dire Weasel) Fix bonus on Entertainer's Cincture (Greater)
-   (Dire Weasel) Fix defense for Ranger's Bramble and auto-heighten damage link
-   (Dire Weasel) Fix defense for Shifting Sand and Swamp of Sloth
-   (Dire Weasel) Fix effect choice labels for Cantrip / Non-Cantrip
-   (Dire Weasel) Fix heightened area for Wave of Despair
-   (Dire Weasel) Fix inline damage types for Enervating Wail
-   (Dire Weasel) Fix prerequisites for Ironblood Stance
-   (Dire Weasel) Move inline silver trait for Silver Crescent to materials
-   (Dire Weasel) Remove duplicate damage links from Divine Armageddon
-   (Dire Weasel) Auto-heighten/level inline damage roll in Blazing Blade and Moonburst
-   (Igor Romanishkin) Add Rule Elements to Viscous Black Pudding's Adjust Shape
-   (In3luki) Fix default token config with stamina variant
-   (rectulo) Fill the price of the staff of the desert winds (major)
-   (rectulo) Set price for Impulse control upgrade
-   (stwlam) Have Champion Dedication grant Deity & Cause and Champion's Code
-   (Tikael) Fix typo in atheism
-   (Wonton) Add area to Bless

## 5.8.3

### Notice

The 5.8 series of system releases is the final one before changes from Pathfinder Player Core and Pathfinder GM Core are added. The majority of changes are simple renaming of some items, traits, and other elements, with some small tweaks to mechanics. Some of the coming non-renaming changes are more substantial:

PC options: current Witch patron themes, Wizard arcane schools, and the Tiefling & Aasimar heritages are being moved to a "PF2e Legacy Data" module, which will be available soon.

Alignment: alignment is being removed from all sheets, but the data will still exist on actors, hidden until a module enables the display of them as traits.

Variant rules: the Dual Class and Ancestry Paragon variant rules are moving to the PF2e Workbench module. Other variants that were not reprinted, like Stamina, will be staying in the system as they are difficult to reproduce in module form.

Premium modules: many adventure modules, such as those developed by Foundry Gaming and Sigil Services, keep up with system releases. This means updating the pf2e system version will be required to run such modules in the future.

We will update our system wiki with a full list of changes prior to the 5.9 system release.

### System Improvements

-   (jfn4th) Add separate setting to skip damage modifiers dialog
-   (stwlam) Enable ephemeral effects for spell damage rolls
-   (Supe) Add buttons to place measured template in spell summaries on actor sheets

### Bugfixes

-   (jfn4th) Fix NPC shield labels
-   (stwlam) Fix condition increasing in effects panel
-   (stwlam) Fix issue causing some roll substitutions to not delete parent effect after rolling
-   (stwlam) Include max stamina when determining whether massive damage is taken
-   (stwlam) Show (core Foundry) secret text in item descriptions to GMs
-   (Supe) Fix fatal override when base damage type is overwritten
-   (Supe) Fix styling for spellcasting drag handle

### Data Updates

-   (Abaddon) Fix description of Grindlegrub Steak and Jax
-   (Dire Weasel) Add automation for Burning Mammoth Commando's Cruel Cutter
-   (Dire Weasel) Add automation for House Drake's Silver Strike
-   (Dire Weasel) Add automation for Stasian Smash
-   (Dire Weasel) Add custom resistance for Perfect Droplet
-   (Dire Weasel) Add damage automation to Garrote Bolt and Garrote Shot
-   (Dire Weasel) Add effects for Glowing Lantern Fruit, Element Embodied (metal and wood), Silver Crescent, Thorn Triad
-   (Dire Weasel) Add leshy trait to Towering Growth
-   (Dire Weasel) Add Metal and Wood to effect for Elemental Absorption
-   (Dire Weasel) Add silver material effect to Sterling Dynamo strikes and magical trait with Golem Dynamo strikes
-   (Dire Weasel) Add spells to Spirit Turtle
-   (Dire Weasel) Add TokenLight to Glorious Plate, Radiant Lance, and Songbird's Brush
-   (Dire Weasel) Add Wood and Metal effects for Elemental Gift
-   (Dire Weasel) Fix physical resistance exception for The First Faithful
-   (Dire Weasel) Fix single action damage for Wronged Monk's Wrath
-   (Intervención) Fix Purple Worm Sting damage
-   (rectulo) Fix typo in description of Retch Rust feat
-   (stwlam) Fix predicate in Ongoing Strategy feat

## 5.8.2

### System Improvements

-   (stwlam) Automate damage-based instant death
-   (stwlam) Display total bulk in vehicle sheet inventory
-   (Supe) Support spell heighten trait overrides
-   (Supe) Move always show dialog toggle from the header to the dialog body

### Bugfixes

-   (stwlam) Fix issue preventing NPC loot sheet inventory from appearing to players
-   (stwlam) Fix handling of shield block buttons on damage messages
-   (Supe) Fix deleting spell fixed heightening entries
-   (Supe) Fix shield hardness label in armor sheet

### Data Updates

-   (Dire Weasel) Brush up Reginald Vancaskerkin and add effect for Overdrive Engine
-   (Dire Weasel) Fix healing links in Life Shot
-   (stwlam) Fix application of Blade Ally property rune effects on handwraps

## 5.8.1

This release updates verified core compatibility to 11.314.

### Bugfixes

-   (alexbrault) Localize damage label in item summary
-   (In3luki) Restore "Rest for the Night" button listener in character sheet
-   (stwlam) Remove checking of hands available for free-hand weapons
-   (stwlam) Fix issue preventing damage weakness associated with fire aura junction from being properly recognized

### Data Updates

-   (Dire Weasel) Add typed damage links to Manifestation Of Dahak's Focused Breath Weapon
-   (Dire Weasel) Update The Eclipse damage to `@Damage` format

## 5.8.0

### System Improvements

-   (In3luki, Supe) Add a damage-roll dialog, similar in purpose to the check roll dialog
-   (In3luki) Add "not" button to Compendium Browser filter tags
-   (stwlam) Add support for aura effect alterations
-   (stwlam) Start adding support for designating damage rolls as actually being healing
-   (stwlam) Add support for property-rune strike adjustments on melee items
-   (stwlam) Do not emit effects from auras of GM-hidden tokens
-   (stwlam) Draw aura textures underneath tokens
-   (stwlam) Make PC attacks that require free hands always visible (though still disabled) on sheet
-   (stwlam) Include UUID in actor roll options as "self:uuid:[uuid]"

### Bugfixes

-   (stwlam) Fix some bonuses and modifiers slipping by battle-form damage exclusion
-   (stwlam) Fix specific magic weapons receiving price changes due to precious materials
-   (stwlam) Fix setting of attribute domain for strikes using weapons with finesse
-   (stwlam) Localize publication form labels in actor/item sheets
-   (stwlam) Fix issue preventing ephemeral effects from operating on elemental blasts
-   (stwlam) Read in `options.difficultyClass` in `SingleCheckActionVariant#use`
-   (stwlam) Restore editability of stamina & resolve from token HUD
-   (stwlam) Fix issue preventing some automatic effect removals after rolls.
-   (Supe) Fix display of variant spell descriptions
-   (Supe) Fix some spell sheet errors and update to fieldset

### Data Updates

-   (Cerapter) Allow Thaumaturge Implements to accept homebrew
-   (Dire Weasel) Add aura to Aura of Forgetfulness
-   (Dire Weasel) Add automation for Brimorak's Flaming Weapon, Corrupted Touch, Eunemvro's Blessed Strikes, Facetbound Nullifier's Field of Force, Secret-Keeper's Designate Apostate, Shoma Lyzerius' Natural-Born Burner, Spirit Turtle's Environmental Balance
-   (Dire Weasel) Add utilize property runes on some NPC attacks
-   (Dire Weasel) Add effect for Cloak of Light and auto-heighten damage link
-   (Dire Weasel) Add effects for Blood Booster, Ghost Oil, Life-Boosting Oil, Wounding Oil
-   (Dire Weasel) Add infused alchemical items to Amateur Chemist's inventory and add attacks
-   (Dire Weasel) Add missing category to Numerian Construct action
-   (Dire Weasel) Add note and damage link to Grendel's Hands of the Murderer
-   (Dire Weasel) Add stupefied check to Vetalarana Emergent's Anticipatory Attack
-   (Dire Weasel) Brush up some NPC Pack Attacks
-   (Dire Weasel) Fix resistances and weaknesses of Bloom of Lamashtu
-   (Dire Weasel) Fix size of The Beast
-   (Dire Weasel) Fix War Formation to remove explicit damage type
-   (Dire Weasel) Set Weapon Surge effect duration to 1 round
-   (Dire Weasel) Update Desiccating Inhalation to include leveled damage in main description and add healing link
-   (Dire Weasel) Update Facetbound Cascader's Energy Ward from effect to RollOptions with suboptions
-   (Dire Weasel) Update some NPC strikes to use damage partials instead of rule elements
-   (Dire Weasel) Fix Brochmaw's Hot Oil damage
-   (In3luki) Fix issue causing hazards to not appear in compendium browser
-   (InfamousSky) Add many equipment and spell icons
-   (Intervención) Makes Overdrive Ally an action rather than passive ability
-   (rectulo) Add missing level requirement in archetype journal for Sorcerer archetype
-   (rectulo) Fix double "action-glyph" elements in some item descriptions
-   (rectulo) Fix the bonus on attack rolls in the sulfur bomb (greater) description
-   (SpartanCPA) Add Exploit Regret reaction to Ifrit Shuyookh
-   (stwlam) Add aura junction effects for fire and water elements
-   (stwlam) Fix hardness alteration of shield in sparkling targe class feature
-   (stwlam) Fix reference to "Vs. Undead" spell effect in text of Lay on Hands
-   (stwlam) Automate Keen rune, Keen-like abilities on PC options and creature attack effects
-   (stwlam) Automatically add/increase Doomed condition at extreme oracular curse stage
-   (stwlam) Remove scouting effects only after initiative rolls
-   (Supe) Add label for fire impulse junction upgrade
-   (Tikael) Add effect for Fresh Produce
-   (Tikael) Add spell effect for Positive Luminance

## 5.7.4

### Bugfixes

-   (Cuingamehtar) Remove empty common rarity tag on feat chat cards
-   (In3luki) Restore availability of stamina token bar attribute
-   (stwlam) Fix dropping feats in campaign feat group
-   (stwlam) Fix rendering error in Firefox of actor sheet inventories

## Data Updates

-   (stwlam) Automate Ghostly Resistance feat
-   (Tikael) Fix rule element in Buckler Expertise

## 5.7.3

### System Improvements

-   (stwlam) Add round-end expiry option for effects
-   (stwlam) Add search input on spell preparation dialog
-   (stwlam) Include `@target` as resolvable in strike, spell, and blast damage rolls

### Bugfixes

-   (Cerapter) Fix ancestry featgroup not being able to filter for homebrew ancestries
-   (Cerapter) Include custom IWR definitions in weaknesses and immunities
-   (stwlam) Prevent error from being thrown in some circumstances when damage dice doubling is enabled
-   (stwlam) Fix issue causing some oracular curse effects to not automatically adjust condition values
-   (stwlam) Fix issue causing thief rogues to roll unarmed strike damage with no attribute modifier
-   (Supe) Prevent party-actor data preparation failure when familiar data preparation fails

### Data Updates

-   (Cora) Make minor Kingmaker data entry tweaks and fixes
-   (CrackJackFlood) Add inert effects for Rage of Elements stances
-   (CrackJackFlood) Brush up effects for scouting
-   (Dire Weasel) Add automation for NPC Expanded Splash and update bomb Strikes
-   (Dire Weasel) Add custom resistance for Maliadi's Collar of Fire
-   (Dire Weasel) Add effect for Vitrifying Blast and Warding Statuette
-   (Dire Weasel) Add infused alchemical items to Blue Viper's (Level 20) inventory, infused trait to several NPC items
-   (Dire Weasel) Add otherTags to Rune Patron and Way of the Spellshot
-   (Dire Weasel) Brush up automation for some skeleton bestiary abilities and Vewslog's Deadeye
-   (Dire Weasel) Refresh copies of NPC bomb strikes
-   (j-bs) Add size increase for heightened Righteous Might spell effect
-   (jfn4th) Fix rarely occuring aberrant rendering of actions on PC sheet
-   (stwlam) Add alternate crit spec effect to Lavasoul feat's Magma Spike
-   (stwlam) Expire Devise a Stratagem effect at end of current round
-   (stwlam) Improve automation of Fearsome Brute feat
-   (Tikael) Add missing spells to FotRP actor
-   (Tikael) Automate Kineticist critical junctions
-   (Tikael) Automate Buckler Expertise feat
-   (Tikael) Fix DC of inline save in Mountain Quake
-   (TiloBuechsenschuss) Fix strike names for Vegetable Lamb and spell variants for Falling Stars

## 5.7.2

### System Improvements

-   (stwlam) Add support for core secret token disposition feature

### Bugfixes

-   (In3luki) Fix compendium browser publication source loading
-   (JellyfishJail) Fix check prompt showing DC 0 checks
-   (stwlam) Fix issue causing damage types to sometimes be lost when using dice doubling on critical hits
-   (stwlam) Fix advanced weapons utilizing non-advanced category proficiencies
-   (stwlam) Fix Take a Breather macro and application of damage to stamina points
-   (stwlam) Fix issue causing general skill feats to not appear in general feat group on PC sheet

### Data Updates

-   (cgollubske) Adding rules for icy disposition
-   (Dire Weasel) Remove inline damage links from Necrotic Bomb
-   (Dire Weasel) Update some NPC bomb strikes
-   (stwlam) Add crossbow other-tag to Lancer weapon

## 5.7.1

### Bugfixes

-   (Cerapter) Fix bonus feats not appearing on the character sheet
-   (In3luki) Fix stamina max value on character sheet and stamina restoration in rest for the night macro
-   (stwlam) Fix selectors for check prompt skills/saves inputs
-   (stwlam) Fix styling quirks on simple NPC sheet

## 5.7.0

### System Improvements

-   (In3luki) Have strike/elemental blast macros render attack popouts
-   (JellyfishJail) Add dialog to create check prompts in chat via party sheet and macro
-   (stwlam) Add support for custom IWR
-   (stwlam) Add support for alterations of several armor properties
-   (stwlam) Add support for defense proficiencies to MartialProficiency RE
-   (stwlam) Allow AE-likes to add simulated partial attribute boosts
-   (Supe) Add configurable effect badge min/max
-   (Supe) Add dialog to perform compendium migrations
-   (Supe) Remove bonus encumbrance from character sheet, add tooltip breakdown to encumbrance and max bulks
-   (Supe) Highlight adjusted @Damage expressions and show base value in a tooltip
-   (Supe) Include priority in header for rule element forms

### Bugfixes

-   (Dire Weasel) Fix issue with showing critical damage cue when metagame settings should prevent it
-   (Dire Weasel) Fix loss of flavor on numeric inline splash and precision
-   (Dire Weasel) Support immunity to persistent damage and wounded conditions
-   (Dire Weasel) Fix NPC effects tab being dimmed when conditions are applied
-   (In3luki) Prevent invalid `BaseSpeed` rule element from throwing error on rendering item sheets
-   (MySurvive) Fix setting of "own-turn" encounter roll option when targeting
-   (PeterG) Restore retrieval of attack targets via macro parameter
-   (stwlam) Resolve DC for unarmed-attack escape
-   (stwlam) Restore pre-expanded NPC attack descriptions
-   (Supe) Fix ability of players to roll kingdom checks
-   (Supe) Fix grievous rune usage with pick crit spec, refactor damage modifier acquisition
-   (Supe) Restore scroll position after codemirror rules edit
-   (Supe) Show DCs by default in kingdom sheet
-   (stwlam) Correctly source material valuation data for armor
-   (stwlam) Fix usability of Malevolence condition
-   (stwlam) Fix WeaponPotency RE not adding "magical" trait to weapons

### Data Updates

-   (Ariphaos) Add effect and correct spell details for Lift Nature's Caul
-   (CrackJackFlood) Brushup most alchemical bombs
-   (Dire Weasel) Add automation for Alchemical Golem's Alchemical Injection, Aurumvorax's Tenacious Stance, Azer's Burning Touch, Kragala's Percussive Reverberation, Thresholder Hermeticist's Cruel Anatomist, Thrown Weapon Mastery, Visperath's persistent acid damage, Waldgeist's Possess Tree, Change Shape Strike (Pukwudgie, Harmony In Agony, Weeping Jack)
-   (Dire Weasel) Add custom resistance exceptions to Dragonshard Guardian, Aliriel, Strigoi Progenitor
-   (Dire Weasel) Add effect for Ghostbane Fulu, Ghost Strike, Psi Strikes, Spider Climb, Stormbreaker Fulu
-   (Dire Weasel) Add inline checks for Daring Act
-   (Dire Weasel) Add light to Angelic Wings and fix fly speed
-   (Dire Weasel) Add missing links and traits to Death Gasp
-   (Dire Weasel) Add missing Zeal for Battle spell to Svaryr Soldier
-   (Dire Weasel) Add Osseous Defense Strike automation for Jitterbone Contortionist
-   (Dire Weasel) Add resistances to Oath of the Devoted
-   (Dire Weasel) Add toggle for Limb Extension
-   (Dire Weasel) Brush up automation for Blade Magus and Ivarsa's Arcane Cascade, some skeleton bestiary abilities
-   (Dire Weasel) Brush up Vilree's Alchemical Crossbow effect
-   (Dire Weasel) Fix damage on Major Blood Bomb
-   (Dire Weasel) Fix domain on Gloom Blade's RollOption
-   (Dire Weasel) Fix effect for Entwined Roots
-   (Dire Weasel) Fix link to Spell Effect: Community Repair and provide link to spell from effect
-   (Dire Weasel) Fix Matron Uldrula's Shard Shield
-   (Dire Weasel) Fix resistance exceptions for Ferrous Form and Metallic Skin
-   (Dire Weasel) Remove description from Malarunk's Cinderclaw Gauntlet attack, as it's automated
-   (Dire Weasel) Remove untyped damage link from Babau's Grievous Strike and add Note
-   (Dire Weasel) Show DC for Augury check
-   (Dire Weasel) Unify Boiling Spring's Freeze and Shatter damage and flag as death note
-   (Dire Weasel) Unify inline damage links for Shanrigol's Sapping Squeeze
-   (Dire Weasel) Update Aives's Smoke Exhalation Note to use item description
-   (Dire Weasel) Update automation for Kolo Harvan's Upward Stab
-   (Dire Weasel) Update Clockwork Hunter's Target Weakness to apply deadly d4
-   (Dire Weasel) Update Exsanguinating Ammunition for persistent bleed recovery
-   (Dire Weasel) Fix Chronomancer's Secrets so that it can be taken a second time
-   (rectulo) Fix formatting in descriptions of Prey Mutagen & Terror Spores, Staff of Sieges, and Webslinger
-   (redeux) Add PFS 3-15 NPCs and hazards
-   (stevecambridge) Condense effects for Community Repair, Corrosive Body, and Fiery Body
-   (stwlam) Add arbalest from Pathfinder Player Core
-   (stwlam) Add aura effect for Bless spell
-   (stwlam) Add breakthrough armor innovations
-   (stwlam) Add REs for Raging Resistance to Fury and Spirit instincts
-   (stwlam) Add self-applied effect for Duelist's Challenge
-   (stwlam) Change ogre hook's weapon category to martial
-   (stwlam) Remove Anticipate Peril spell effect after initiative rolls
-   (Supe) Remove extranous link in Ghosts in the Storm
-   (Supe) Add effect for Shattershields
-   (Tikael) Add content from the Season of Ghosts player's guide
-   (Tikael) Add metal and wood domains
-   (Tikael) Add Shatter Glass reaction
-   (Tikael) Adding missing traits to Straugh's claw strike
-   (Tikael) Automate Lock On feat
-   (Tikael) Fix rule element on Fearless Sash
-   (Tikael) Move ancestry text to journals and refresh pregens
-   (Tikael) Move class details to journals, refresh class item on pregens
-   (Tikael) Update Light spell effect description to remaster description

## 5.6.2

### System Improvements

-   (Supe) Add new kingdom building phase and pop open sheet

### Bugfixes

-   (stwlam) Allow all users to expand collapsed action descriptions
-   (stwlam) Fix assurance roll substitutions
-   (stwlam) Fix processing of flexible trait on armor
-   (stwlam) Fix rendering error on some rule element forms for unowned items
-   (Supe) Fix scrolling quirks in item sheet description tabs
-   (Supe) Fix detection of selected republic/thaumocracy in kingdom builder

### Data Updates

-   (Dire Weasel) Add automation for Coating Of Slime, Deflecting Wavem, and NPC Destructive Vengeance
-   (Dire Weasel) Add Note RE to NPC Gardener's Resolve and fix formatting
-   (Dire Weasel) Automate persistent damage for Accursed Touch, Core Cannon, and Vicious Fangs
-   (Supe) Automate insider training kingdom feat

## 5.6.1

### Bugfixes

-   (jfn4th) Ensure PC sheet navigation bar is always above panel content
-   (stwlam) Fix issue preventing Battle Form attacks from appearing
-   (stwlam) Fix issue causing some MAP rule elements to not apply

### Data Updates

-   (AFigureOfBlue) Fix typo in Id Ooze's puddled ambush ability
-   (Dire Weasel) Add Grab ability to Id Ooze and unify some constrict damage
-   (Dire Weasel) Add light automation to Reborn Sun Warrior's Flame Spike
-   (Dire Weasel) Refresh copies of Crimson Fulcrum Lens and Mirror Image spell across compendiums
-   (Dire Weasel) Add effect for Selfish Shield
-   (Dire Weasel) Update localized strings with "positive" or "negative" to use "vitality" or "void"
-   (stwlam) Set alliance of Ekundayo, Linzi, and Valerie to "party"
-   (Tikael) Add automation to Sarenrae's moderate boon

## 5.6.0

### System Improvements

-   (In3luki) Add forms for Aura and Token Light rule elementsRuleElement
-   (In3luki) Stack item quantities of items looted with the Loot NPCs dialog
-   (JellyfishJail) Add token-to-token visual flanking indicator when highlighting objects
-   (stwlam) Add forms for MultipleAttackPenalty and Token Image rule elements
-   (stwlam) Add support for spell damage dice type overrides
-   (stwlam) Display carried bulk and encumbrance on NPC sheet
-   (Supe) Add sheet and tooling for managing a Kingmaker kingdom
-   (Supe) Allow opening sheet of effects from effects panel tooltip
-   (Supe) Support reordering NPC abilities
-   (Supe) Add drag/drop reordering of rule elements
-   (Supe) Move character height/weight to biography

### Bugfixes

-   (In3luki) Fix overflow in Compendium Browser settings tab
-   (MySurvive) Add set-as-initiative button to kept roll for rerolls
-   (stwlam) Move on-update coercion of item-level values to document classes
-   (stwlam) Check for immunities when granting effects and conditions
-   (stwlam) Fix browsing compendiums with multiple actor/item subtypes
-   (stwlam) Predicate-test MultipleAttackPenalty rule elements
-   (stwlam) Restore rarity to spell sheet
-   (stwlam) Fix issue causing spell ranks to not be transmitted via aura effects
-   (Supe) Allow players to send loot and party (physical) items to chat
-   (Supe) Fix party tokens being actor-size linked
-   (Supe) Use thin scrollbar everywhere for Firefox

### Data Updates

-   (7H3LaughingMan) Fix saddlebags bulk reduction
-   (7H3LaughingMan) Fix stealth bonus in air Gate junction
-   (Dire Weasel) Add automation for Demonic Strength, Hammer Mastery, Open Mind item, Standard of the Primeval Howl
-   (Dire Weasel) Add damage links to The Whispering Reeds and adjust formatting
-   (Dire Weasel) Add inline check to Spellwrack
-   (Dire Weasel) Add resonant effects for several Aeon Stones
-   (Dire Weasel) Add spell effect for Endure and Foresight
-   (Dire Weasel) Brush up Dead Faine's Sneak Attack
-   (Dire Weasel) Brush up Demonologist and consolidate Breach the Abyss
-   (Dire Weasel) Emphasize Magnificent Mansion in Remaster journal
-   (Dire Weasel) Fix capitalization on Take its Course and Heightened Awareness
-   (Dire Weasel) Fix Dead Faine's toggle label to off-guard
-   (Dire Weasel) Fix labels on Spell Effect: Wish-Twisted Form
-   (Dire Weasel) Fix level of Strigoi Servant
-   (Dire Weasel) Fix predicate on Mighty Bulwark
-   (Dire Weasel) Fix some incorrect remaster spell names and fix missing emphasis
-   (Dire Weasel) Fix usage and bulk of Ring of Observation
-   (Dire Weasel) Move Glutton's Jaw's temporary Hit Points roll to Note
-   (Dire Weasel) Restore brawling group to Sharp Fangs
-   (Dire Weasel) Update damage links in Worm's Repast to auto-scale
-   (jfn4th) Fix skills, languages, items in A Few Flowers More pregens
-   (stwlam) Brush up rule elements on Crimson Fulcrum Lens
-   (stwlam) Migrate positive/negative damage types and traits to vitality/void
-   (stwlam) Use Token Mark rule element in Devise a Stratagem
-   (Supe) Fix Bond with Mortal Damage for Cunning Fox/Feathered Bear
-   (Tikael) Add content from issues 2 and 3 of Pathfinder Wake the Dead
-   (Tikael) Add remaster spells previewed in the Paizo blog
-   (Tikael) Change NPC sneak attack entries to new rules
-   (Tikael) Change NPC strike trait labels to use 'feet' instead of 'ft'
-   (Tikael) Update Sneak Attack bestiary glossary ability to simplify rules
-   (TMun) Add battleforms from Fist of the Ruby Phoenix
-   (TMun) Update license text with recent and announced products

## 5.5.3

### Bugfixes

-   (In3luki) Fix "view item" buttons on choice set prompt
-   (stwlam) Fix handling of rarity updates on non-physical items
-   (stwlam) Include hazards in encounter metrics
-   (stwlam) Remove coloration of common-rarity inventory items
-   (stwlam) Render highlights for auras on familiars
-   (stwlam) Reset aura renders when token size changes
-   (Supe) Fix aura rendering and detection for tiny tokens
-   (Supe) Don't add non-persistent damage dice and modifiers to purely persistent damage
-   (Supe) Resolve injected properties in roll note predicates

### Data Updates

-   (Dire Weasel) Add automation for Giant Gecko's Uncanny Climber
-   (Dire Weasel) Add effects for Codex of Destruction and Renewal, Knock, Repel Metal fix level
-   (Dire Weasel) Add materials to several NPC attacks
-   (Dire Weasel) Brush up and homogenize automation for Evasion and Deft Evasion
-   (Dire Weasel) Fix effect link name in Runic Weapon spell
-   (Dire Weasel) Fix Overpowering Jaws' Note visibility
-   (dogstarrb) Remove unneeded will save button from Nudge Fate
-   (Drental) Fix hardwood scamp attack bonus
-   (Abaddon) Fix Entities from Afar prerequisites
-   (shemetz) Fix handful of typos in en.json
-   (Supe) Add effect for furnace form
-   (Tikael) Add missing feat from EC player's guide
-   (Tikael) Data Entry World Fixes September 16 2023
-   (websterguy) Fix reference to master ability in Skilled familiar ability flat modifier

## 5.5.2

### System Improvements

-   (In3luki) Show action cost in feat chat card when available
-   (stwlam) Add tooltips explaining threat and XP award in encounter tracker
-   (stwlam) Add visibility toggles to PC biography sections

### Bugfixes

-   (stwlam) Fix labeling and options presentation of Striking runes in weapon sheet
-   (stwlam) Recalculate encounter metrics when party membership is changed while encounter is running
-   (Supe) Fix display of spell DCs in item summaries

### Data Updates

-   (In3luki) Eliminate console noise from Versatile Blast feat when Kinetic Aura effect isn't present
-   (Intervención) Fixed typo on Aura trait description
-   (stwlam) Predicate on encounter threat level in Battle oracle curse effect
-   (Tikael) Fix stats of Vicious Abyssal Bunny Swarm

## 5.5.1

### Bugfixes

-   (stwlam) Fix roll-data resolution in inline damage links
-   (stwlam) Restore damage buttons to NPC/hazard attack rolls
-   (Supe) Add support for brackets in Fast Healing/Regeneration rule element form

### Data Updates

-   (Dire Weasel) Add secondary save link to Beheading Buzz Saw
-   (Dire Weasel) Add effects for Flame Dancer, Galvanic Chew, Phoenix Ward, and Thermal Remedy

## 5.5.0

### System Improvements

-   (darvey) Allow dragging stashed items in party sheet to members in sidebar
-   (darvey) Add default filter to free archetype feat slots on PC sheets
-   (darvey) Add property runes missing from armor and weapon dropdowns
-   (In3luki) Add buttons to choice set prompts that open item sheets (given the choices are items)
-   (stwlam, Friz) Automatically price and rename armor with runes and precious materials
-   (stwlam) Add a system tab to scene config windows, allowing hearing radius and rules-based vision to be managed per scene.
-   (stwlam) Show basic threat/XP data in encounter tracker: will continue to refine by adding settings and ability to award XP from it.
-   (stwlam) Add an "appearance" property to Aura rule element configuration, allowing for greatly expanded control over an aura's looks. Textures, including videos, are now supported. Border and fill colors have been moved to this property.
-   (stwlam) Refine visibility rules for auras:
    -   During encounters, borders are always visible unless configured in the rule element to not be. Outside of encounters, they are only visible when a token is hovered or controlled. Only GMs can see aura borders from "opposition" (typically NPC) tokens.
    -   Highlights are only visible during encounters, and only when a token is hovered or controlled. Visibility to players follows the same rules as borders.
    -   Textures are always visible, in or out of encounters, and even to players for ones emanating from opposition tokens.

### Bugfixes

-   (darvey) Fix item summary / spell buttons firing when pressing enter elsewhere in the form
-   (Dire Weasel) Fix TempHP rule element to resolve injected properties in its predicate
-   (In3luki) Fix ancestry feats without an ancestry trait being filtered in the compendium browser feats tab
-   (In3luki) Fix "Select Other Variant" button being show on heightened spell chat cards
-   (In3luki) Fix issue causing degree of success to sometimes not be updated when rerolling.
-   (stwlam) Fix styling and content selection of limited PC sheet
-   (stwlam) Refrain from having ABP attack potency make weapons magical
-   (stwlam) Limit visibility of degree-of-success button cues in strike attack rolls
-   (stwlam) Hide spell DCs in chat cards when appropriate
-   (stwlam) Fix issue preventing NPC sneak attack from applying damage during flanking
-   (stwlam) Fix calculation of counteract total modifier
-   (Supe) Fix Grant Item form defaults
-   (Supe) Fix effects that modify degree of success of persistent-damage recovery checks

### Data Updates

-   (Abaddon) Remove duplicate skill entries for Angelique Loveless and Glaz Nixbrix
-   (arthurtrumpet) Add an effect for Emblazon Armament (Shield)
-   (Chas) Brushup rule elements on Acrobat dedication & Tumble Behind
-   (Cuingamehtar) Fix frequency of Expeditious Inspection
-   (Cuingamehtar) Improve Flame Wisp effect counter
-   (Dana) Fix inline perception check icon
-   (darvey) Add armor specialization rule elements for armor groups added in Treasure Vault
-   (Dire Weasel) Add automation for Broadleaf Shield, Ooze Ammunition, Cape of Illumination
-   (Dire Weasel) Add bleed damage to Splintering Spear
-   (Dire Weasel) Add effect for Conductive Weapon, Envenom Fangs, Ferrous Form, Ginger Chew, Journeybread (Power), Merciful Balm, Pucker Pickle, Sand Form, Spiny Lodestone, and Tremorsense (spell)
-   (Dire Weasel) Add inline Checks to Invoke The Elements
-   (Dire Weasel) Add token light to Fulminating Spear and Starfaring Cloak
-   (Dire Weasel) Fix action cost of Alicorn Lance activation
-   (Dire Weasel) Fix broken spell link and missing emphasis in Remaster Changes journal
-   (Dire Weasel) Fix damage links for Slashing Gust and Splinter Volley
-   (Dire Weasel) Fix Emblazon Armament (Shield) effect to only allow shields
-   (Dire Weasel) Fix some formatting in the GM screen and archetypes journals
-   (Dire Weasel) Unify inline damage links for Steaming Fields' Steam Jet
-   (Dire Weasel) Update Flashy Disappearance effect to include grant of Invisible condition
-   (Dire Weasel) Update torch icon and swap Strike icon when lit
-   (Drental) Add automation for Watch This!
-   (Dwim) Automate Poison Weapon feat chain
-   (Dwim) Improved automation of Gunslinger initial deeds
-   (LebombJames) Bring some inventor feats up to date with automation
-   (stwlam) Add aura to Aura of Despair
-   (stwlam) Fix rule elements on Large Bore Modifications
-   (Tikael) Add automation to Tactician's Helm
-   (Tikael) Add inline check to Disturbing Knowledge
-   (Tikael) Add missing notes to Kinzaruk
-   (Tikael) Add missing NPC from PFS 4-12
-   (Tikael) Add missing Hryngar trait
-   (Tikael) Add Talos and Ardande traits to geniekin feats
-   (Tikael) Fix applicability of effects from air and wood kinetic auras
-   (Tikael) Improve weapon inventor overdrive automation

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
