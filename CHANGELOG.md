## 7.7.3

### Bugfixes

- (Supe) Add ammo to compendium browser item type filters
- (Supe) Fix display of coinage value in the inventory
- (Supe) Fix soldier weapon specialization
- (Supe) Fix styling of description in loot sheet
- (Supe) Fix thrown npc attacks being detected as melee instead of ranged

### Data Updates

- (Ambrose) Add Shobhad Longrifle rounds
- (Ambrose) Correct instances of mis localized apostrophe/r-squo in en.json
- (Ambrose) Detach effect from Soaring Flight feat
- (Ambrose) Remove Spirit Damage Dice Rule Elements from Cacodaemon
- (kromko) Fix some feat prerequisites

## 7.7.2

### System Improvements

- (Supe) Add usage icons for auto fire and ranged alt usages
- (Supe) Skip confirmation for eject ammo if shift is held

### Bugfixes

- (Abrault) Fix party attempting to roll inline checks meant for player characters
- (stwlam) Add more data-type precautions for old treasure and npc attacks
- (Supe) Add the infused trait to alchemical ammo
- (Supe) Allow loading special ammo without a specific type
- (Supe) Fix disabling auto destroy for non-magazine ammo
- (Supe) Fix draw/sheathe of area weapons
- (Supe) Fix localization of range tag in player strike
- (Supe) Fix selectors and modifier adjustments for area and auto fire dcs
- (Supe) Fix weapons embedded into shields
- (Supe) Roll over magazine uses when loading partially used ammo in a stack
- (Supe) Show area fire description instead of item description
- (Supe) Show message when reloading during combat
- (Supe) When deleting temporary items, also delete loaded ammo

### Data Updates

- (Ambrose) Add initiative note to Reflexive Stance
- (Ambrose) Add missing action cost to Mythic Refocus and Crusader's Masquerade
- (Ambrose) Add missing traits and descriptions to Perception Mastery
- (Ambrose) Add scaling damage to Rouse the Forest's Fury
- (Ambrose) Clean text on Uvuko's deity entry and Tern flock abilities
- (Ambrose) Link Innovations article from Inventor Class Journals to Inventor Dedication and restrict Weapon Innovation Advanced Martial Profiency
- (Ambrose) Remove self reference from Sudden Charge
- (Ambrose) Update Push to use Shove Action Macro
- (Dire Weasel) Add invested trait to Moonsilver Necklace
- (Dire Weasel) Fix some `compendiumSource`s for RoE NPCs
- (Dire Weasel) Fix Strategic Stance's success aura size
- (Dire Weasel) Remove duplicate data in Tanagaar's description
- (Dire Weasel) Update Control Water area description
- (Dire Weasel) Update some NPC senses to structured data
- (kromko) Fix some feat prerequisites
- (kromko) Remove a link to Heroic Recovery effect from Martyr RE
- (kromko) Remove Gecko's Grip prerequisites
- (Rigo) Add description alterations to Fortunate Blow, Targeting Strike, Shield of Faith, and Unrivaled Analysis
- (Rigo) Add effect for Defiant Banner, Pennant of Victory, Shielded Recovery, Unsteadying Strike, Fortunate Blow, Spike Skin, and Targeting strike
- (Rigo) Add frequency data to Pennant of Victory
- (Rigo) Add modifier upgrade to Observational Analysis
- (Rigo) Correct typo on Adamant Sentinel's Destructive Strike ability
- (Rigo) Replace Energy Shot Choice Set with Roll Option dropdown
- (SpartanCPA) Correct Note trigger on Rogue and Swashbuckler evasion features
- (Supe) Migrate several incorrect uses of strike-damage selectors
- (Tikael) Add item bonus to Greater Inflammation Flask
- (Tikael) Fix Overwatch Field effect

## 7.7.1

### Bugfixes

- (Supe) Fix permission check allowing players to roll saving throws for Area Fire and Auto-Fire attacks
- (In3luki) Fix treasure-item validation not allowing a quantity of zero

## 7.7.0

### System Improvements

- (Supe) Also transfer item contents when transferring a container
- (Supe) Convert NPC range traits to fields in the item sheet
- (Supe) Create Ammo item type and implement reloading
- (Supe) Implement Area Fire and Auto Fire for PCs

### Bugfixes

- (stwlam) Fix retrieval of in-memory unarmed attacks for use in damage application
- (stwlam) Perform forced replacement in armor-to-shield migration
- (Supe) Avoid excluding the tech trait in generated npc attack traits
- (Supe) Fix batch size for consumable non-mundane ammo

### Data Updates

- (Ambrose, Dire Weasel, Mecha Maya, Rigo, Tikael) Add content from Monster Core 2
- (Ambrose) Add bleed damage to Bloodrager's physical attack spells
- (Ambrose) Add climb speed to Gripping Limbs feat
- (Ambrose) Add effect to Triangular Teeth
- (Ambrose) Add entry for Necromantic Resistance to Lastwall Sentry journal
- (Ambrose) Add `handwraps-of-mighty-blows` tag to Bloodknuckles
- (Ambrose) Fix data errors in Mirror of Glory and Nizca Iricol
- (Ambrose) Fix feat grant of Planar Migrant background
- (Ambrose) Remove Animal Companion Gallop action
- (Ambrose) Remove unneccessary notes from Greater Flaming Rune automation
- (Ambrose) Separate Android's Emotionally Unaware perception penalty to Sense Motive
- (Ambrose) Update Jin Li's deity entry description to match updated TXWG text
- (Dire Weasel) Add effect for Bit of Luck, Charming Push, Primal Herd
- (Dire Weasel) Add inlines to Massacre, Phantasmal Killer, and Phantasmal Calamity
- (Dire Weasel) Fix action cost of Raised Cavalry's Trampling Charge
- (Dire Weasel) Fix formatting of Consecrate spell description
- (kromko) Fix Guarded Advance linking to Raise a Tome feat
- (kromko) Fix minor Trusty Helmet activation formatting error
- (Mecha Maya) Reduce light color intensity of several effects
- (rectulo) Remove prerequisites for dragon stance
- (rectulo) Remove unarmored prerequisite in Yacob's Dragon Stance
- (Rigo) Add note upon receiving critical damage with Mountain Strategy (#20633)
- (Rigo) Fix typo in Propaganda Promoter background's lore skill
- (Rigo) Reduce light intensity of Light spell effect
- (Rigo) Remove disabledIf fields reliant on resolved values in Exemplar ikon feats
- (Tikael) Add axe and arrow vulnerabilities to apply once list
- (Tikael) Add effect for Sepulchral Mask
- (Tikael) Add missing focus spells to PFS actors
- (Zinneryte) Fix Hydra Spear base item and properties

### Under the Hood

- (stwlam) Convert TreasureSystemData to `TypeDataModel`
- (stwlam) Replace `stackGroup` with `category` in `TreasureSystemData`
- (Trent) Add roll data to consumable damage rolls
- (Trent) Always include action roll options in basic actions
- (Vauxs) Resolve Battleform speeds

## 7.6.4

### Enhancements

- (Supe) Prefer displaying item prices in gp if at least one gp (e.g. "15sp" -> "1 gp, 5 sp")

### Bugfixes

- (stwlam) Fix application of Clumsy condition from auto-applied Encumbered
- (stwlam) Set token distance label to be initially hidden
- (Supe) Fix dropping actors to parties from compendium
- (Supe) Fix player drag drop to their own items
- (Supe) Fix solarian crystals when using sf2e anachronism
- (Supe) Prevent errors when granting flat persistent damage (such as with Flames Oracle)

### Data Updates

- (Abaddon) Add glitterspore tremorsense
- (Ambrose) Add Anointed Ground to Remaster journal spells page
- (Ambrose) Add automation to Mythic Skill ability and add mythic resistance to missing actors
- (Ambrose) Add You Can't Kill an Idea feat to Broken Chain Mythic Destiny journal page
- (Ambrose) Clean up text on Avenging Runelord Mythic Destiny and add Martial Proficiency automation
- (Ambrose) Correct embed link in Summoner class journal
- (Ambrose) Separate Guarded Advance feat into Guardian and Archetype version
- (Dire Weasel) Add automation for Bone Gladiator's "Loose Bones"
- (Dire Weasel) Brush up Meokdan, Roc's "Snack", Trident of Dis abilities
- (Dire Weasel) Fix action type and cost of Oracle of Zagresh's "Destructive Touch"
- (Dire Weasel) Fix level of Daemonic Fog, various inline roll options, and several NPC ItemAlterations
- (Dire Weasel) Update "Effect: Spin Tale" to use TokenMark and Digly's Oil of Sympathy inline rolls to use `@Damage`
- (rectulo) Fix label on the effect of Runelord Researcher
- (Rigo) Correct Detect Magic spell link in Nagaji Spell Familiarity
- (Rigo) Increase emanation area of heightened Sepulchral Mask spell
- (Rigo) Match deity favored weapon proficiency rank with martial weapons on Vindicator
- (Tikael) Automate Battle Planner skill feat
- (Trent) Fix forced movement and prone roll options
- (websterguy) Clean up background lores

### Under the Hood

- (stwlam) Don't apply absolute value on resolved reach value in CreatureSize RE

## 7.6.3

### Bugfixes

- (stwlam) Fix handling of copy-to-clipboard buttons on item sheet RE panel
- (stwlam) Fix pathing to certain variable in default Rule Element template
- (Supe) Fix certain invalid predicates from potency and striking migration
- (Supe) Fix context menu for other parties in Actor Directory
- (Supe) Fix transferring physical items into a container
- (Supe) Open up area and auto fire in production

### Data Updates

- (Ambrose) Add Alchemical Food tag to Sparking Pepper String
- (Ambrose) Add description to Time trait
- (Ambrose) Correct price for Lion's Call equipment
- (Dire Weasel) Brush up automation for Bullyrag Beatdown and Frightening Critical
- (Dire Weasel) Fix automation for Sedacthy Speaker's Exploit Weakness
- (Dire Weasel) Set showDC:all for some PC-facing flat checks that mitigate critical hits
- (rectulo) Fix backlink in Effect: Runelord Researcher
- (stwlam) Fix setting shield data in Fire Shield REs

### Under the Hood

- (Supe) Ignore publication source when stacking items

## 7.6.2

### Bugfixes

- (stwlam) Musical refrain

## 7.6.1

### Bugfixes

- (stwlam) Prevent error when closing item sheets with auto generated RE forms

## 7.6.0

### System Improvements

- (stwlam) Add support for automatic generation of RE forms
- (stwlam) Convert variant-rules settings menu to `ApplicationV2`
- (stwlam) Indicate additional movement cost from difficult terrain in waypoint labels
- (stwlam) Retire and migrate away Striking and WeaponPotency REs
- (stwlam) Use prose-mirror editor for description in vehicle sheet
- (Supe) Add support for configuring NPC attacks as SF2e area/auto fire
- (Supe) Show embedded spell of consumables in the sheet (actor owned only for now)
- (Tikael) Drop minimum class HP from 6 to 4

### Bugfixes

- (stwlam) Clear turn marker on encounter end
- (stwlam) Fix DamageAlteration RE validation for numeric values
- (stwlam) Fix hearing through walls with proximity sound restriction
- (stwlam) Fix inline rolls against AC ignoring modifiers
- (stwlam) Fix reach check for opening trade dialog following item drop
- (stwlam) Fix ruler action-glyph positioning given non-default grid sizes
- (stwlam) Fix size downgrades of Bulk for values greater than 1
- (stwlam) Set default actor and item types for create dialog
- (stwlam) Show activity count instead of minimum speed under Exploration Activities in party sheet

### Data Update

- (Ambrose) Add automation to Five-Gods Ram feat and update roll syntax on Whirling in the Summer Storm feat
- (Ambrose) Add Escape `/act` syntax to bestiary Engulf action
- (Ambrose) Add Revenge of the Runelords Mythic Destinies to Archetypes journal
- (Ambrose) Add The Scourge of Sheerleaf NPCs
- (Ambrose) Correct Critical Specialization Rule Element on Iruxi Armaments feat.
- (Ambrose) Update brackets on Spell Effect: Ooze Form to use new `match` syntax
- (Dire Weasel) Add automation to Soaring Wings
- (Dire Weasel) Add effect for Caltrops and update to remaster text
- (Dire Weasel) Add variable action cost to some NPC ability descriptions
- (Dire Weasel) Brush up Angelic Chorus and Iron Maiden Trap
- (Dire Weasel) Fix effects for Soaring Wings and A Little Bird Told Me...
- (Dire Weasel) Fix some basic saving throws and frequencies and missing `compendiumSource`
- (Dire Weasel) Remove and redirect extraneous copy of Sand Racer
- (HavocsCall) Fix the category of the Bendy Arm Mutagens
- (Clemente) Update sidebar's proficiency ranks to fix localization styling regression
- (rectulo) Fix description of the puff dragon
- (rectulo) Fix Plunderer of the Hive's Riches description in re-en.json
- (rectulo) Fix the description of orator's filibuster
- (Rigo) Add darkvision with Signifer's Sight while wearing Signifer's Mask
- (Rigo) Add Divine Warden of Brigh from Paizo Blog
- (Rigo) Add note to Mythic Casting regarding PFS 6-09's allowance for kineticist impulses
- (Rigo) Allow Raise Haft's parry trait granting to work with any weapon held in 2 hands
- (Rigo) Append Will save to mindshifted feats
- (Rigo) Apply Empowered Onslaught adjustment to selected spell only
- (Rigo) Correct action cost of Instant Minefield and resistance granted by Inked Panoply
- (Rigo) Lower priority of Celestial Armaments' Token Light
- (Rigo) Remove acid damage and automate temporary Hit Points effect from Untwisting Iron Buffer
- (Rigo) Rename Battle Harbinger's Divine Font to Battle Font
- (Rigo) Update Oddity Identification's Flat Modifier predicate to remaster
- (Rigo) Update rule elements and formatting on Goloma ancestry feats and heritages
- (Rigo) Upgrade Snare DCs to class DC with Snarecrafter Dedication and Powerful Snares
- (Rigo) Grant additional languages in Tangle-Tongue's Wit and Pact of the Rune Dragon
- (Suldrun45) Fix the automation of Effect:Augmented Body
- (Tikael) Add content from the RotRL Player's Guide
- (Tikael) Add missing spell DC for Lich Legion
- (Tikael) Fix Mukradi's breath weapon
- (Tikael) Limit Rogue Dedication to skill feats at or below the character's level
- (Tikael) Remove incorrect link to Invisible condition in Consult the Spirits
- (trapbuilder2) Add ItemAlteration to Leap And Fire that shows the feat information on its prerequisite feat/reaction

### Under the Hood

- (stwlam) Ensure item name and UUID are included in DamageAlteration warnings
- (stwlam) Retire and migrate away RE brackets and add match() function
- (Supe) Rewrite adding wands and scrolls in svelte and make them configurable

## 7.5.2

### System Improvements

- (stwlam) Add support for configuring PC hand count from ancestries

### Bugfixes

- (In3luki) Fix filtering of some disabled sources in the Compendium Browser
- (stwlam) Avoid some issues from too-closely managing hover distance line
- (stwlam) Disallow interactive rolling of blind rolls from chat log
- (stwlam) Don't load packs with lower than LIMITED ownership for compendium browser
- (stwlam) Exclude grenades from getting strength to damage
- (stwlam) Fix extraction of adjustments of non-synthetic speed modifiers
- (stwlam) Fix most issues with calculation of derived speeds
- (stwlam) Ignore check/speed penalties from battle forms via modifier adjustments
- (stwlam) Limit AE purges during migrations
- (stwlam) Link action to Reset World Time button in World Clock settings
- (stwlam) Retrieve land speeds created by BaseSpeed RE
- (stwlam) Undo setting of weapon dice-upgraded flag by damage alterations after rolling
- (Supe) Fix closing choice set without selection

### Data Updates

- (Ambrose) Add `immutable:true` to Sacred Defense inline rolls
- (Ambrose) Correct Choir Politic Patron Skill to Society
- (Ambrose) Update immunities on additional Wisp variant actors
- (Clemente) Add PreparationType localization strings for Focus and Ritual entries
- (CotillionTheRope) Fix the extra precision damage of the item Mantis Embrace's Crushing Embrace
- (CotillionTheRope) Fix the weapon damage dice upgrade from the item clay sphere
- (Dire Weasel) Add automation and inline scaling damage to Blazing Spirit
- (Dire Weasel) Fix some missing NPC `compendiumSource`
- (Rigo) Add Consume Flesh action to Priest of Kabriri
- (Rigo) Automate Officer's Education
- (Rigo) Ensure Energized Spark's Damage Alteration occurs after other similar rules
- (Rigo) Lower Gate Junction roll option priority to fire before default AELike upgrades
- (Rigo) Prevent multiple instances of Precise Debilitations Damage Dice from stacking
- (Rigo) Push priority of skill-based Crafting Abilities after default AE-Like upgrades and overrides
- (Rigo) Reduce penalty from drained and enfeebled conditions with Sanguine Tenacity
- (Rigo) Update Settlement Scholastics to Player Core 2
- (stwlam) Fix selector of Blessed Swiftness's speed bonus
- (stwlam) Include full description of Shield Throw trait

### Under the Hood

- (stwlam) Guard against modules assigning frozen point objects to `RulerPF2e#path`
- (stwlam) Include distance roll options in roll-context actor clones

## 7.5.1

### System Improvements

- (stwlam) Show action cost in label of final planned waypoint

### Bugfixes

- (stwlam) Fix sheet issue causing loot actors to refuse to be merchants
- (stwlam) Ensure trade is properly aborted on receiver's end after declining a request

### Data Updates

- (Ambrose) Add "immutable:true" to Sacred Defense inline rolls

### Under the Hood

- (stwlam) Include speed `type` in `speed.otherSpeeds` shim

## 7.5.0

### Highlights

- (stwlam) Make several improvements to measurement rulers and labeling
    - Drag-measurement waypoint labels now show distance traveled instead of movement cost.
    - When moving a creature token using a non-travel speed, action glyphs mark squares where Token movement would translate into a single Stride action.
    - Outside of encounters, a creature's travel speed is used by default (managed from Token HUD).
    - Measurement labels are now at a fixed scale, making them readable even when zoomed far out.
    - A line is now drawn between a controlled and mouse-hovered token to go along with the distance label.
    - Display of distance labels can now be controlled via system client setting.
- (stwlam) Add a creature-to-creature trade application
    - It can be accessed by players via dropping items on allied/neutral tokens and by anyone from the actor directory. Someone must be logged in to represent each trading party.
    - When dropping an item, hold the Shift key to offer it as a gift and skip the full trade window.

### System Improvements

- (Clemente) Improve localizability of "Cast" term and the Compendium Browser's "Abilities" label
- (stwlam) Add support for mitigating/ignoring difficult terrain (see, e.g., Unimpeded Stride)
- (stwlam) Add support for retrieving counteract statistic via `ActorPF2e#getStatistic`
- (Supe) Add support for resolvable-value item trait alterations
- (Supe) Add support for the resilient trait
- (Supe) Allow the SpecialResource rule element on NPCs
- (Supe) Implement sf2e equipment-grade item alterations

### Bugfixes

- (Supe) Fix sf2e weapons/armor, Runic Body/Weapon effects when using ABP
- (Supe) Fix issue causing re-rendering slowdowns in encounter tracker
- (stwlam) Fix issue causing battle forms to not ignore armor speed/check penalties
- (stwlam) Fix issue sometimes causing a trained spellcasting proficiency to not apply to spell attack rolls
- (stwlam) Include "melee-damage" selector when retrieving modifiers for melee spell and blast damage
- (stwlam) Fix clearing targets in TokenMark RE prompt
- (stwlam) Fix pricing of Starfinder armor improvements
- (stwlam) Prevent FlatModifier REs from applying twice to armies
- (stwlam) Fix displayed toggle status in notifications created by roll-option toggle macros

### Data Updates

- (Abaddon) Add cursebound condition to en.json
- (Abaddon) Fix cloister robe and unstable gearshift action
- (Ambrose) Add Dawn of the Frogs content
- (Ambrose) Add deception to selectors for Tallusian's Rubble ability
- (Ambrose) Add Magic Immunity automation to select Will-o-Wisp actors
- (Ambrose) Correct Ancient Diabolic Dragon's Claw attack modifier
- (Ambrose) Fix Crime Kingpin's Sneak Attack damage, Heraldic Proclamation, and typos in PFS Season 7 actors
- (Ambrose) Fix Feat/Feature Effects compendium banner color
- (Ambrose) Remove Snare Kit and redirect to Artisan's Toolkit per Pathfinder Player Core 2
- (Ambrose) Remove Swing Back from Morlock Thrall stat block
- (Ambrose) Update Pick a Lock text to remaster
- (Ambrose) Update text formatting on Shepard of Errant Winds and Speaker in Sibilance
- (CotillionTheRope) Add Jotunborn journal entry
- (CotillionTheRope) Fix banner color of Spells and Equipment compendiums
- (Dire Weasel) Add effect for Cloister Robe and Rokurokubi's Extend Neck
- (Dire Weasel) Fix acuity of Bloodsense feat
- (Dire Weasel) Fix name of Ancestor Statue
- (Dire Weasel) Fix some predicates for NPC skill variants
- (Dire Weasel) Show Escape DC for Rooting rune
- (jokr) Fix hemlock stage 3 damage
- (kanongil) Fix level of Revitalizing Finisher
- (rectulo) Fix a typo in Deep Pockets
- (rectulo) Fix level of the Staff of the Ruling Beast
- (rectulo) Fix Guardian class abilities table
- (rectulo) Update Maneuver in Flight description to remaster
- (Rigo) Automate Glorious Banner
- (Rigo) Correct typo in Shadow Sheath spirit damage roll option predicate
- (Rigo) Disable transcendence action toggles if chosen ikon has no divine spark
- (Rigo) Limit Crunch to only upgrade jaws base damage dice faces
- (Rigo) Limit Damage Alterations on psychic conscious mind to base damage
- (stwlam) Fix selector of Treerazer's Staggering Strike note
- (stwlam) Include Agile trait for small claw at higher levels of Animal Form: Crab
- (Tikael) Fix action type of Naiad Queen's Water Healing
- (Tikael) Improve automation of Luminous Sprite

### Under the Hood

- (stwlam) Export module-subclassable classes (`AutomaticBonusProgression`, `ElementalBlast`, `RuleElement`)
- (stwlam) Keep `_stats` when exporting to JSON
- (stwlam) Rewrite creature-speed data structure and place at `system.movement.speeds`
- (Supe) Convert choice selection to Svelte application
- (Supe) Add trait annotations logging

## 7.4.3

### System Improvements

- (stwlam) Convert core modify region behavior to difficult terrain
- (stwlam) Allow familiars and other zero-reach creatures to operate doors within five feet

### Bugfixes

- (In3luki) Fix special statistics not correctly extending basic spellcasting
- (stwlam) Fix opening Elemental Blast item from PC sheet
- (stwlam) Include party actor in door reach checks as well
- (stwlam) Prevent grabbing adjacent tokens in keybound `cycleStack` operation
- (stwlam) Remove flipping of initial `unconstrainedMovement` scene control value
- (Supe) Fix exploration activities getting cleared on refresh

### Data Updates

- (Ambrose, Dire Weasel, Tikael) Convert multiple inline rolls to `/act`
- (Ambrose) Add automation to `Drilled in Formations` for select troop actors and the Change Formation bestiary action
- (Ambrose) Add Commander trait to Reactive Strike
- (Ambrose) Condense Ooze Form spell effects
- (Ambrose) Convert several wand items to the correct item type
- (Ambrose) Correct Animate Dream's spell list and resistances (Gatewalkers version)
- (Ambrose) Remove errant traits and `GrantItem`'s from select items
- (Ambrose) Remove Quetz Couatl actor from Pathfinder Bestiary 2 Compendium and redirect to Monster Core actor equivalent
- (Ambrose) Update Umbral Journey's publication source
- (Daomephsta) Cleanup NPC `system.skills` data entry/migration mistakes
- (Dire Weasel) Add automation for Vorens' Adroit Duelist
- (Dire Weasel) Brush up Paskis Nine-Knives
- (Dire Weasel) Convert some inline `line` templates to `square`, and some `burst` to `cylinder`
- (Dire Weasel) Correct some publication titles
- (kromko) Add Lich Legion's Frightful Presence DC
- (kromko) Add statistics to Xulgath Dinosaur Cavalry's Trample ability
- (mechamaya) Add tech trait option to vehicles
- (Mose) fix data for arrow-catching shield
- (Tikael) Remove duration from Daze

### Under the Hood

- (In3luki) Resolve strike damage modifier value in `BattleFormRuleElement`

## 7.4.2

### System Improvements

- (stwlam) Define a party actor's manipulate "reach", use with reach enforcement

### Bugfixes

- (stwlam) Fix various issues preventing saving of kit-item updates from sheet
- (stwlam) Fix issue preventing familiars with canvas-altering effects from appearing on initial load
- (stwlam) Make sidebar of familiar sheet scrollable
- (Supe) Fix rendering of damage buttons from attack-roll messages
- (websterguy) Fix Token Image ring background color input

### Data Updates

- (Ambrose) Convert Wand of Crackling Lightning, Traitorous Thoughts, and Wand of Wearying Dance to magic wands
- (Ambrose) Correct Deity Choice Set on Mortal Dedication dedication feat
- (Daomephsta) Add missing colon in inline damage for Sword Bash of Arboreal Copse
- (Dire Weasel) Add missing inline saving throw links to Dread Gaze and Feral Possession
- (Dire Weasel) Fix reach distance for Cosmic Form fist Strike
- (kromko) Add missing link to Aura of Sophistry localization
- (Rigo) Fix Munitions Crafter allowing any ammunition to be created

## 7.4.1

### System Improvements

- (Dire Weasel) Show DC for /act inlines with custom label
- (stwlam) Add configurable support for checking character reach when opening doors and looting
- (stwlam) Refine token distance text and refrain from showing on all when holding alt
- (Supe) Add activate button for consumables created via quick alchemy

### Bugfixes

- (kromko) Fix some localization keys
- (stwlam) Fix distance text rounding
- (stwlam) Fix issues with party deposit tokens button and remove token spin retrieval for now
- (stwlam) Fix editing price of kit items
- (Supe) Don't auto adjust price for tech and analog specific magic weapons

### Data Updates

- (Ambrose) Convert Wand of Toxic Blades to magic wand equipment type
- (Dire Weasel) Add automation for Relinquish Control and Instinctive Maneuvers
- (Dire Weasel) Add automation for The Harder They Fall
- (Tikael) Remove duplicate prompts for Wellspring Mage

### Under the Hood

- (stwlam) Have `PricePF2e.fromString` accept unitless numeric strings

## 7.4.0

### System Improvements

- (Clemente) Add (unbound) Toggle Compendium Browser keybinding
- (stwlam) Add notification to PC sheet when no armor is equipped but one is equippable
- (stwlam) Flip default of Unconstrained Movement token tool
- (stwlam) Show disabled Elemental Blast attack for kineticists without Kinetic Aura effect
- (stwlam) Show distances from controlled token underneath highlighted tokens
- (Supe) Add installed usage and sf2e weapon/armor upgrades
- (Supe) Add support for weapon, armor, and shield grade
- (Trent) Add support for custom single-application (instead of per instance) weaknesses

### Bugfixes

- (stwlam) Fix click handlers on popped out chat messages
- (stwlam) Bump max vehicle size to 300ft
- (stwlam) Fix flanking detection failing for tiny creatures in some positions
- (stwlam) Fix temporary token changes not appearing to some users until token is moved or client is reloaded
- (Tikael) Increase maximum weapon damage dice to support SF grenades
- (websterguy) Fix TokenImage form opacity and scale inputs

### Data Updates

- (Abaddon) Fix crossbow infiltrator feat sorces
- (Ambrose, Dire Weasel) Add "area-effect", "area-damage", "damage-effect", and/or "inflicts:" roll options to many abilities
- (Ambrose) Add actor to Phantasmal Protagonist and spell effect for temporary Hit Points
- (Ambrose) Add effect to Trudd's Strength filigree
- (Ambrose) Add magical trait to Eye of Apprehension
- (Ambrose) Add missing Liar's Demise item
- (Ambrose) Add Special Statistics and Roll Options to Fulcrum Lens items
- (Ambrose) Condense Fey Form spell effects
- (Ambrose) Condense Monstrosity Form spell effects
- (Ambrose) Condense Daemon Form spell effects and correct Kithangian size in Demon Form spell effect
- (Ambrose) Condense various Parry feat effects
- (Ambrose) Convert many special wands to wand-category consumable
- (Ambrose) Correct Horus' divine font to heal
- (Ambrose) Correct source for Quick Draw player feat
- (Ambrose) Delete Pathfinder Bestiary Terotricus actor and redirect to the Monster Core equivalent
- (Ambrose) Remove AC details text from Losko actor
- (Ambrose) Remove attribute damage from Draconic Barrage
- (Ambrose) Remove inline roll from Attached trait description
- (Ambrose) Update Demontangle actor to Remaster variant
- (Ambrose) Update Protosoul actor to match Remaster changes
- (Ambrose) Update Raise a Shield effect's publication source to Pathfinder Player Core
- (Ambrose) Update range on Read Fate to match Player Core update
- (Ambrose) Update roll syntax for Fortune's Coin to use `coin flip`
- (Ambrose) Update Spirit Turtle's Unbalancing Stomp to use Damage Alteration.
- (Dire Weasel) Add effect for Hellshadow's Clinging Smoke
- (Dire Weasel) Condense effects for Cosmic Form
- (DocSchlock) Add height calculation and template to Rising Hurricane
- (In3luki) Fix styling of Compendium Browser settings
- (In3luki) Omit level from mythic point rerolls if Proficiency without Level is enabled
- (kromko) Fix Mantle of the Frozen Heart spell effect RE damage text
- (rectulo) Change sylvan for fey in arboreal staff languages known
- (rectulo) Fix a typo in the attribute boost of the exemplar class at 1st level
- (rectulo) Fix level of Lightspeed Assault
- (rectulo) Fix level of Primal Howl feat
- (Rigo) Audit automation and formatting on Jotunborn feats
- (Rigo) Automate Officer's Medical Training
- (Rigo) Grant Tactics feature with Commander Dedication
- (Rigo) Remove Hunt Prey toggle and update automation on several Ranger features
- (Rigo) Remove non-exclusive class archetypes from early class feature selection
- (Rigo) Set key attribute on multiclass dedication class DC subfeatures
- (Rigo) Set location keys on War Mage and Munitions Master dedication feats
- (Rigo) Use modifier instead of total DC on inline DC AdjustModifier upgrades
- (Rigo) Use Weakness rule element on Veil of Spirits effect
- (Rigo) Widen Clue In's Flat Modifier selector to apply to any check
- (samanthaoldenburg) Remove bard language from note text
- (SpartanCPA) Add tokens for Battlecry! Iconics
- (stwlam) Add Bloodsense to sense types
- (stwlam) Increase duration of Effect: Devise a Stratagem to expire on next turn start
- (Tikael) Add heightening info to Collective Transposition
- (Tikael) Add Time trait to IWR
- (Tikael) Improve automation of Witchlight Follower background
- (Trent) Fix Blessed Counterstrike weakness
- (websterguy) Fix AdjustModifier rules targeting Parry

## 7.3.1

### Bugfixes

- (In3luki) Fix traits in compendium browser being empty after opening with a filter
- (Supe) Fix collecting kingdom resources
- (Supe) Fix drag drop after changing active party

### Data Updates

- (Ambrose) Add area-effect, area-damage, damage-effect, and inflicts: options to additional select items and NPC abilities
- (Ambrose) Add effects for Mantle of the Frozen/Melting Heart
- (Ambrose) Condense Devil Form spell effect
- (Ambrose) Convert Wand of Dumbfounding Doom to proper magic wand type
- (Dire Weasel) Brush up some NPC Core actors
- (kromko) Update effect links in the static language file
- (Phill101) Fix jabali's rarity
- (rectulo) Fix the rune in the major version of the jyoti's feather
- (Rigo) Add class description to Battlecry! iconics and fix path to token texture
- (Rigo) Add effect for Plant Banner temporary Hit Points
- (Rigo) Add effects for Naval and Mountaineering Training Tactics
- (Rigo) Add inline healing roll to Rallying Banner
- (Rigo) Add spell effect for Shielding Formation
- (Rigo) Fix Major Knave's Standard aura alteration tag

### Under the Hood

- (websterguy) Localize name alteration value in item alteration

## 7.3.0

### System Improvements

- (In3luki) Implement rerolling checks with a mythic point
- (In3luki) Restore wheel rotation for unlocked measured template previews and add a tooltip explaining the new placement workflow
- (stwlam) Clear everyone's movement history at end of anyone's turn
- (Supe) Add other-tags section to details tab of ability sheet
- (Supe) Add usage for the implanted item carry type used by grafts and starfinder augmentations
- (Supe) Collapsed actions now crop instead of doing a text-only replacement
- (Supe) Sort usages list in item sheet

### Bugfixes

- (stwlam) Fix "managed by" message in scene darkness adjuster
- (stwlam) Fix deity favored weapons not being visible in the proficiencies tab
- (stwlam) Fix prefixing of token-mark roll options
- (stwlam) Fix prototypeToken width/height when viewing compendium items
- (stwlam) Fix token mirroring from `TokenConfigPF2e`
- (Supe) Fix badge reset overriding formula value
- (Supe) Fix certain items not being detected as consumables in the crafting tab
- (Supe) Fix spacing between strike tag rows in chat messages
- (Supe) Strip special keys when migrating to avoid errors

### Data Updates

- (Ambrose, DocSchlock, Mecha Maya, Rigo, Tikael) Add data from Battlecry!
- (Ambrose) Add automation and effect to Flynkett's Kettle Up ability
- (Ambrose) Add automation to Cornered Fury
- (Ambrose) Add effect for Singing Shortbow's ability Song of Soothing and Sporescout's Cloak of Subversion action
- (Ambrose) Add effect to Humanoid Form, Inescapable Grasp, and Outcast's Curse
- (Ambrose) Add Produce Flame to the Remaster Journal changes
- (Ambrose) Add The Scourge of Sheerleaf pregens
- (Ambrose) Automate Sky Dragon's Divine Lightning
- (Ambrose) Condense several Demon Form effects
- (Ambrose) Convert Retrieval Belt into container items
- (Ambrose) Fix Moonlight Ray's predicate and Pocket Library's effect description
- (Ambrose) Update additional Treasure Vault wands to spell wands
- (Ambrose) Update automation for Chromatic Armor's effect, Wand of Shardstorm, Wand of Choking Mist and Wand of Chromatic Burst
- (Ambrose) Update automation for select War of Immortals bestiary actors
- (Ambrose) Update automation to Conspirator Dragon's Conjure Disguise
- (Ambrose) Update Dedication trait to match Pathfinder Player Core text
- (Ambrose) Update Wand of Dazzling Lights wand type
- (Dire Weasel) Add alchemical trait to Blisterwort
- (Dire Weasel) Add effect for Oil of Potency
- (Dire Weasel) Brush up some NPC Core actors
- (Dire Weasel) Fix category of Hydrocannon
- (Dire Weasel) Fix routine action cost for Bee-Induced Panic
- (Dire Weasel) Fix some missing spell sources
- (Dire Weasel) Standardize routine action cost for Bee-Induced Panic
- (Drental) allow the hydra heads effect on alkoasha to go to 0
- (HavocsCall) Fix the category of Neophyte's Fipple and Bargainer's Instrument
- (jfn4th) Fix Osprey Spellcaster language grant
- (kromko) Add link to source to Overclock Senses effect
- (kromko) Correct some area-effect and area-damage options
- (kromko) Fix some lore localization keys
- (kromko) Update Gunslinger dedication description in journal to Remaster
- (Phill101) Fix wyrm's wingspan price
- (rectulo) change envision for (concentration) in druid's crown
- (rectulo) Fix description of aura trait (remaster)
- (rectulo) Update theatrical mutagen (lesser) to remaster
- (reyzor1991) Fix Effect: A Challenge for Heroes
- (Rigo) Automate Instinct Crown
- (Rigo) Explicitly label condition flat checks
- (Rigo) Fix scaling of Improved Elemental Blast
- (Rigo) Update Debilitating Bomb automation to account for Greater and True Debilitating Bomb
- (Rigo) Upgrade Energy Emanation damage with Energy Blessed along with a description addendum

### Under the Hood

- (Supe) Add weapon and armor fundamental rune item alterations
- (Supe) Preserve certain changes when chaining spell.loadVariant()
- (Supe) Add ability to configure which base weapons are always thrown
- (Supe) Modules can now declare homebrew class traits, and they're available in feat subfeatures
- (Supe) Fix message.item not returning the base spell after clicking "select other variant"

## 7.2.3

### System Improvements

- (Dire Weasel) Add icons for inline `cube`, `cylinder`, and `square` template buttons
- (Mecha Maya) Add name and group alterations to ItemAlteration
- (stwlam) Add definition for "magic" immunity
- (stwlam) Prevent check for `activeGM` from aborting simulated token updates
- (Supe) Improve search performance of ABC picker and fix clearing query
- (Supe) Show member coins in party sheet stash

### Bugfixes

- (stwlam) Fix issue causing token changes to not fail when simultaneously changing two or properties (such as size and texture)
- (stwlam) Exclude token image in OOC messages
- (stwlam) Fix display of melee-sheet damage partials
- (stwlam) Fix handling of CreatureSize RE changes that do not change reach
- (stwlam) Fix issue causing combatant drag & drop to result in the dropped combatant landing at the wrong initiative position
- (Supe) Fix issue causing limited-application modifier adjustments to sometimes not apply correctly

### Data Updates

- (Ambrose) Add `area-effect`, `area-damage`, `damage-effect`, and `inflicts:` options to select NPC abilities
- (Ambrose) Add automation to Vrock's Dance of Ruin
- (Ambrose) Add Feint action to Distracting Spellstrike
- (Ambrose) Add flat modifier and roll option to `Stab and Blast` Gunslinger feat
- (Ambrose) Add Trip (acrobatics) action to Tumbling Opportunist
- (Ambrose) Add variable damage automation to select NPC abilities
- (Ambrose) Allow variable damage types for Angry Townsfolk's Pitchfork and Torches ability
- (Ambrose) Condense Dragon Form effects and add a grant action for Dragon Breath
- (Ambrose) Correct Choice Set options for Spore Wars Heroic Artifact items
- (Ambrose) Correct damage type for Avenging Wildwood piercing variant
- (Ambrose) Correct syntax typo in Beiran's Icy Japes ability
- (Ambrose) Update Surging Serum text to match Player Core 2
- (Dire Weasel) Add effect for Wight's Drain Life
- (Dire Weasel) Fix Guhdggi's spell bonuses
- (kromko) Add failure Note to Magical Shorthand
- (kromko) Fix Inky Tendrils disable acrobatics check
- (rectulo) Update Corpseward Pendant to match (remaster) Treasure Vault
- (rectulo) Fix the description of the Minor Armory Bracelet
- (Rigo) Automate Elemental Bloodline focus spells' damage types and traits
- (Rigo) Select and grant a dedication feat with Social Purview
- (Rigo) Update Bomber's Field Vials toggle label to be more informative
- (Rigo) Update formatting and automation on Anadi ancestry feats and heritages
- (Rigo) Upgrade base size of Devrin's Cunning Stance to PC2 Marshal aura
- (Tikael) Add content from Gatewalkers Remastered Player's Guide
- (Tikael) Fix effect for Hunt the Razer's Pawn
- (Vauxs) Add ItemAlteration Description to Extended Kinesis

## 7.2.2

### Bugfixes

- (stwlam) Check whether actor is owned before updating token size
- (stwlam) Fix error when config predicate is missing
- (stwlam) Fix mouse-accessibility of Modular-trait select element
- (Supe) Fix deleting effect badges
- (Supe) Fix deleting feat subfeature language slots
- (Supe) Fix players dragging compendium search results from sidebar
- (Supe) Fix retrieving effect origin roll options

### Data Updates

- (Ambrose) Add `area damage`, `area-effect` and `damaging-effect` options to more NPC abilities
- (Ambrose) Add automation for NPC abilities with variable damage types
- (Ambrose) Add Note automation to Resounding Bravery and brush up effect automation
- (Ambrose) Add slugs and traits to some NPC fist Strikes
- (Ambrose) Condense Quantium Golem actor variants
- (Ambrose) Update automation for more Werecreature actors
- (Dire Weasel) Add effect for Bugul Noz's Haunting Wail
- (Drental) Fix the inline Check in Primadonna
- (HavocsCall) Fix the level and price of Dr. Ushernacht's Astonishing Ink (Major)
- (HavocsCall) Remove errant weapon data from Belt of Good Health
- (jfn4th) Update Inveigle to PC2 Description
- (kromko) Fix typo in Environmental damage journal title
- (kromko) Update Witch Patron Theme description to Player Core
- (Rigo) Add description addendum to 1-action spellshapes with Spellshape Mastery
- (Rigo) Add effect and spell description addendum to Chaotic Spell and Shared Sight
- (Rigo) Add effect for Helt's Spelldance
- (Rigo) Add effect for Sympathetic Strike and correct its action cost and frequency
- (Rigo) Add Ephemeral Effect for Spirits' Interference
- (Rigo) Add Furious Finish and Oversized Throw effects
- (Rigo) Add Note to Barreling Charge's Athletics check while having Overpowering Charge
- (Rigo) Add Pointed Question effect and other minor investigator fixes
- (Rigo) Add spellcasting tradition trait to some witch feats
- (Rigo) Automate and update formatting of Greater Spiritual Evolution
- (Rigo) Automate Bloodline Mutation
- (Rigo) Automate damage and focus point expenditure of Consecrate Spell
- (Rigo) Automate several permanent quickened-granting features
- (Rigo) Implement reach increase from Assume Earth's Mantle stance
- (Rigo) Omit Bravado notes if the character already has Panache
- (Rigo) Update skill suboption dropdowns to use config list
- (Rigo) Use Damage Alteration over Damage Dice RE for mindshifted Psi Strikes

### Under the Hood

- (Supe) Create CSS variables for inventory header color for theming
- (Supe) Create encumbrance css color variables for theming

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
