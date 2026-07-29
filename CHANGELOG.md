## 8.3.0

## Bugfixes

- (Chromatic Penguin) Accept a leading "+" in modifier dialog inputs on Firefox
- (Chromatic Penguin) Apply roll options to inline damage rolled from effect tooltips
- (Chromatic Penguin) Fix attribute builder breaking after opening it for a second character
- (Chromatic Penguin) Fix background color on dragged equipment
- (Chromatic Penguin) Fix runes added to handwraps via item alterations not applying to unarmed strikes
- (Chromatic Penguin) Fix senses granted via Details not upgrading
- (Chromatic Penguin) Fix stale and clobbered state in Svelte applications
- (Chromatic Penguin) Fix total price not updating on item transfer dialogs
- (Chromatic Penguin) Fix two-handed grip toggle on Strike rule elements
- (Chromatic Penguin) Improve trade initiation: party-sheet member drops, request expiry with alerts on both sides, prevent sending to familiars
- (Chromatic Penguin) Improve visual accessibility of spell slot number input
- (Chromatic Penguin) Include origin item roll options in effects dragged from a sheet
- (Chromatic Penguin) Match self-applied effect card body to the standard action card
- (Chromatic Penguin) Recalculate encounter threat/XP when a combatant's level or alliance changes
- (Chromatic Penguin) Remove manipulate trait from alchemical bomb strikes
- (Chromatic Penguin) Truncate long names, fix broken search icon in Trade Dialog
- (Chromatic Penguin) Snapshot area fire save DC in chat message context
- (Dantar) Add back TakesNoDamage text on applyDamage card
- (Dantar) Apply each persistent damage from dragged formula
- (Dantar) Make clown car respect elevation and levels
- (Dantar) Prevent chat bubbles if message isn't in the in-character style
- (kromko) Fix not being able to remove spells from deities
- (Noisyink) Use check icon for trade accept button in unaccepted state
- (stwlam) Prevent some some fields in the Aura RE form from resetting their values

### Data Updates

- (Ambrose, kromko) Add content from Lost Omens High Seas
- (Ambrose) Add Animate Nightmare actor variants
- (Ambrose) Add automation to Vrolikai's Focused Flames ability
- (Ambrose) Add Chelaxian Scion Archetype feats and actions
- (Ambrose) Add Chelaxian Scion dedication to Archetypes journals
- (Ambrose) Add effect for Ten Day's Breath
- (Ambrose) Add effect to Sanguine Evasion and restore missing folders
- (Ambrose) Add Marine Marauder to Archetype Journals
- (Ambrose) Add Spell Effect: Fly to Urveth
- (Ambrose) Add toggle to Scamp's Fast Healing
- (Ambrose) Add variants for Create a Diversion to Deceptive Tactics
- (Ambrose) Correct Aqueous Dragonblood RE FlatModifier selector
- (Ambrose) Correct Malfunctioning Perfumery's Crushing Notes DC value
- (Ambrose) Expand GM Screen Research journal entry
- (Ambrose) Fix Blood Painter spellcasting stats
- (Ambrose) Remove and redirect reprinted Lost Omens High Seas actors
- (Ambrose) Remove Cyclonic Cannon equipment item
- (Ambrose) Remove redundant sleep immunity from Lythazossa
- (Ambrose) Remove Wyrm on the Wing tattoos
- (Ambrose) Update Know-It-All to account for Archetypes
- (Dantar) Add master spellcasting into the Master Eldritch Archer Spellcasting
- (Dantar) Add rules for verdant- and pristine- weapon feats
- (Dantar) Exclude self from fire and metal aura junction effects
- (Dantar) Implement One-Inch Punch for Monastic Archer Stance
- (Dantar) Implement rule for effortless reach
- (Dantar) Localize family ability glossary
- (Dantar) Update description of boulder seed bombs, add critSuccess note
- (Dire Weasel) Add automation for Ioton's Leech Thought
- (Dire Weasel) Add automation for Ogre Hurler's Toss Kobold
- (Dire Weasel) Add effect for Golden Wings
- (Dire Weasel) Add inflicts roll option to Greater Constrict
- (Dire Weasel) Add inline roll options to Engulf
- (Dire Weasel) Add link to effect for NPC ability Pinpoint Poisoner
- (Dire Weasel) Add SpecialStatistic automation to Efficient Capture, Envelop, Hurl Net, Shackle, Swift Capture
- (Dire Weasel) Add spell effect for Scholarly Recollection
- (Dire Weasel) Add Strike automation for Xulgath Gutrager's Corrosive Kiss
- (Dire Weasel) Fix compendiumSource for Romi Bracken's copy of Blood-Drinker Blade
- (Dire Weasel) Fix order of Ochiastis's Quill damage partials
- (Dire Weasel) Fix spelling of rank in all copies of Spell Repertoire
- (Dire Weasel) Remove spell name override from Pickled Demon Tongue (Major) description
- (Dire Weasel) Tidy description for Redemption
- (Dire Weasel) Unify damage for Nethershade
- (Dire Weasel) Unify damage for Warcat of Rull's Piercing Fangs
- (Dire Weasel) Unify Ravener's Void Breath damage
- (Dire Weasel) Update Azlanti Elemental Nexus's Elemental Wave to use selectable damage
- (Dire Weasel) Update Sliding Statue's Slide to use `@Damage`
- (hollyvalenta) Correct Arcana modifier for Dust Bunny Swarm
- (hollyvalenta) Update Hellknight-Errant to not increase Hellknight feat count by 5
- (kromko) Move Lead the Way to Knight Vigilant archetype
- (Longstrider) Fix ruffian Combat Grab requirement
- (rectulo) Change Attack of Opportunity to Reactive Strike in Baomal
- (rectulo) Correct spelling of "Talmandor" in For Talmandor! For…
- (rectulo) Fix spelling of "effect" in zhuraita
- (Rigo) Implement Bodyguard's increased Taunt penalty using Ephemeral Effect
- (Rigo) Replace core inline roll with Shove inline action in Bands of Force
- (Rigo) Update critical specialization predicate in Weapon implement's initiate benefit
- (SpartanCPA) Add Hell's Destiny Player's Guide Backgrounds
- (SpartanCPA) Combine Klacktel Inline Damage
- (Tikael) Add missing Skirmish trait and skirmish actions

## 8.2.0

### System Improvements

- (Dire Weasel) Add support for ring templates
- (Geliogabalus) Add weapon boost automation
- (JiDW) Improve Dice So Nice integration with Damage Type
- (stwlam) Set cone angle to 90 when created from scene controls

### Bugfixes

- (Chromatic Penguin) Fix hiding roll opposer names
- (Dantar) Add {item|id}-{meleeOrRanged}-damage domain to attacks, to enable ammunition rules
- (Dantar) Hide ActorsDeadAtZero setting from players
- (In3luki) Restore missing radio buttons in shield block dialog
- (In3luki) Restore missing reroll icons in chat context menu
- (Noisyink) Fix DOM helpers returning null cross-window in PopOut!
- (Noisyink) Preserve token mirror state when applying TokenImage scale override
- (stwlam) Allow "base" actor and item subtypes to construct
- (stwlam) Set `ignored` if predicate fails in `StrikeRuleElement#beforePrepareData`
- (Supe) Fix icon of add/remove currency dialog
- (Supe) Fix tags in dark mode formula picker

### Data Updates

- (Ambrose) Add action macros to Deceptive Tactics
- (Ambrose) Add area-damage options to Rainbow Fumarole's inline damage
- (Ambrose) Add effect for Belt of Long Life
- (Ambrose) Add Initiative note to the Hellbreaker Dedication
- (Ambrose) Add link to confused status to Shoggoth's Maddening Cacophany and remove DC explanation note on Constrict
- (Ambrose) Add note RE to Fracture Timeline
- (Ambrose) Condense spell effects for several battleforms
- (Ambrose) Correct action cost of Rally Point
- (Ambrose) Correct Asp of Grief data entry errors
- (Ambrose) Correct inline check for Lassoing Lash
- (Ambrose) Correct Nosferatu Malefactor's fang damage type
- (Ambrose) Correct rollOptions for Invoke Rune's Pride effect
- (Ambrose) Correct typo in Explosive Arrival flags
- (Ambrose) Remove Detect Alignment cantrip and update Strigoi creature abilities to match Remaster update
- (Ambrose) Update action cost of Mask of Mercy per Treasure Vault Remaster update
- (Ambrose) Update Invoke Rune effect to match Monster Core update
- (Ambrose) Update localization for Aerial Form to match existing localizations
- (Ambrose) Update Propulsive Leap's damage syntax
- (Ambrose) Update Wyrm on The Wing tattoo to match Remaster updates
- (Dire Weasel) Add automation to Crystal Healing
- (Dire Weasel) Add effect for Feast on Fear, Gentle Breeze, and Shark Tooth Charm
- (Dire Weasel) Add increased damage automation to Telekinetic Swarm Trap
- (Dire Weasel) Add some links to Soulsight
- (Dire Weasel) Fix bonus type for Vengeful Wrath
- (Dire Weasel) Fix save for Eclipse Burst
- (Dire Weasel) Standardize inline action for Embrace
- (Dire Weasel) Tidy description of Malefic Mirror and some inline actions
- (Dire Weasel) Update some equipment to grant conditions
- (Dantar) Add a separate effect for redcap brigade
- (Dantar) Add Arcane tradition to Retrocognition and its references
- (Dantar) Add missing `replaceAll: true` for Talon and Claw stance effects
- (Dantar) Allow didactic strike to affect attack spell damage
- (Dantar) Fix greater Endless Quiver material choices
- (Dantar) Implement rules for Hellknight Mobility feat
- (Dantar) Update dawnsilver-tree and shield-pistol rounds
- (kromko) Add some missing compendium sources for physical items
- (kromko) Clean up whitespace around inline buttons; Fix Spellsap Grenades data
- (kromko) Fix Fire and Water Wisps' Resonance description
- (kromko) Fix formatting of Flawless Celestial Shawl and Smoking Sword
- (kromko) Fix invalid language keys
- (kromko) Fix Skill Mastery overwriting all feat descriptions
- (kromko) Remove duplicate dedication from Provocator Archetype journal page
- (kromko) Remove remnants of pre-remaster activation from Greater Screech Shooter
- (rectulo) Add description text for Grandmaster NPC
- (rectulo) Add forgotten text in Black Belt NPC
- (rectulo) Add missing text in Cultist description
- (rectulo) Add teleportation trait to Retrieval Prism
- (rectulo) Change damage type from bludgeoning to slashing in Storm Hag's Cutting Gale
- (rectulo) Fix a typo in a Dwarf Battalion ability
- (rectulo) Fix a typo in Spell Repertoire feature
- (rectulo) Fix description in Gathered Lore and Precise Discipline features
- (rectulo) Fix Fiend Caller description
- (rectulo) Fix typo in spell name for Tumbleweed Leshy Courier
- (rectulo) Revise description for Retrieval Prism (Greater)
- (Rigo) Make Crossbow Crack Shot's bonus damage and backstabber upgrade mutually exclusive
- (SpartanCPA) Add RuleElement for Seugathi Guard's Magic Item Mastery feature
- (stwlam) Update icon for Elixir of Gender Transformation
- (Tikael) Add missing localization for Commander Fortitude Expertise
- (Tikael) Fix action cost of Start the Festival
- (TroelsL) Fix 2 NPCs in Outlaws with malformed resources JSON
- (YellowAfterlife) Fix Spirit Thresher's damage type

### Under the Hood

- (kromko) Remove Catfolk feat Expanded Luck and redirect it to Lucky Break
- (Noisyink) Avoid duplicate feat group slots in custom campaigns slots
- (stwlam) Remove migrations for foundry versions up to and including 10
- (stwlam) Support retrieval of highest and lowest save from creatures

## 8.1.2

### System Improvements

- (stwlam) Add "robot" trait to creature identification

### Bugfixes

- (Chromatic Penguin) Refresh token bars on Temp HP updates.
- (kromko) Fix item transfer message localization
- (steve148) Update changelog link in foundry to the new one
- (stwlam) Fix aura rule forms not updating includeSelf
- (stwlam) Fix tokens being visible when partially clipping through a wall
- (Supe) Fix errors migrating certain old effects with invalid badge min/max fields
- (Supe) Fix issues attack rolls using item spellcasting features such as kinetic activation
- (Supe) Remove invalid expend and unprepare buttons from flexible spellcasting

## Data Updates

- (Ambrose) Add effect to Moon Hag's Ride the Moonbeams ability
- (Ambrose) Correct Essence Overflow's damage formula
- (Ambrose) Localize Overhand Smash Notes text for Volodmyra
- (Ambrose) Update Ardent Armirger text and prerequisites to match Hellfire dispatches
- (Dire Weasel) Add automation to Spirit of Vigil
- (Dire Weasel) Brush up automation for No Stranger to Death
- (kromko) Fix Opportune Trickster's description formatting
- (kromko) Remove Ghoul Fever and Paralysis from Skaveling
- (rectulo) Fix description for Devastation Cavalry Brigade
- (rectulo) Fix formatting in Ort Mob description
- (rectulo) Revise Starstone Aspirant archetype details in journals

## 8.1.1

### Bugfixes

- (stwlam) Restore close button to attack popout
- (Supe) Fix migration failure on certain embedded spells in scrolls and wands

### Data Updates

- (Ambrose) Extract Noise from Rollable Tables and Deity Boons and Curses
- (SpartanCPA) Correct Attack Bonus for Young Wish Dragon
- (SpartanCPA) Cleanup and Reorganize labels involved in ChangeShape REs

## 8.1.0

### System Improvements

- (stwlam) Have darkness lights work like darkness regions when controlling a token with darkvision
- (Supe) Add strike buttons to chat log upon creating Quick Alchemy bombs

### Bugfixes

- (Chromatic Penguin) Fix updating scene darkness via darkness adjuster tool
- (Dantar) Fix precision immunity crit damage miscalculation
- (Dantar) Apply holy/unholy to sanctified NPC attacks
- (oWave) Fix feat delete on ABCSheet silently failing
- (Rigo) Use modifier type to find proficiency modifier in mythic rerolls
- (stwlam) Add system roll-link listeners to detached windows
- (stwlam) Fix setting message mode for slash command damage rolls, checks with the "secret" trait
- (stwlam) Fix issue causing feats and class features with no-longer-valid traits to throw errors
- (Supe) Fix tag strikethrough when rerolling untrained improvisation using mythic proficiency
- (Supe) Fix troop creation in unviewed scenes
- (Supe) Propagate elite/weak updates to all troop siblings
- (Supe) Prevent troop token flags from being saved to prototype tokens

### Data Updates

- (Ambrose) Add missing Attribute Boost to the Beginner Box Merisiel
- (Ambrose) Add missing grant for Additional Lore to Halfling Lore feat
- (Ambrose) Condense Adapt Self Spell Effects
- (Ambrose) Remove action cost from Improvised Pummel
- (Ambrose) Remove malformed skill entry from Bikkhasura
- (Ambrose) Update Dwarven Gods deity stat block descriptions to use published sources instead of the Pathfinder Wiki
- (Ambrose) Update Sea Dragon's Liquify Resistance automation to match Draconic Codex update
- (Dantar) Add draconic benefactors from draconic codex to dragon disciple choices
- (Dantar) Add GM notes for Hellbreakers relics
- (Dantar) Make Ageless Patience always apply on nat 1
- (Dantar) Make Alternate Amps replace base ones for Silent Whisper and Parallel Breakthrough
- (Dantar) Make Reinforced Chassis use medium armor proficiency
- (Dantar) Make Taunt affect class DC
- (Dantar) Migrate Kholo/Tripkee traits and related strings
- (digitalshadowhawk) Automate Battle Lute item bonus to performance checks
- (Dire Weasel) Add automation for Heir of the Saoc
- (Dire Weasel) Add automation for Urnak Lostwind's Brutally Disarm
- (Dire Weasel) Add inline typed damage rolls to Volatile Reagents
- (Dire Weasel) Add missing frequences to Feed on Fear
- (Dire Weasel) Add roll options to inline saving throw for Paralysis NPC ability
- (Dire Weasel) Fix range of Wild Winds stance's Wind Crash Strike
- (Dire Weasel) Fix water trait predicate for Elemental Assault effect
- (Dire Weasel) Unify damage for Kithangian's Rasping Tongues
- (kromko) Add slugs to Living Weapons's Strikes
- (Longstrider) Fix multiclass dedications proficiencies
- (Longstrider) Lightly brush up Swashbuckler
- (Razytos) Remove malformed skill entry from Garadasura
- (Rigo) Add effect for Ferrous Butterfly's A Thousand Cuts slashing weakness
- (Rigo) Support inline damage from Notes with Energized Spark
- (TroelsL) Fix malformed skills in Sovereign Dragons
- (TroelsL) Remove badly formatted Spear Frog skills
- (TroelsL) Remove malformed skill from Risen Runelord Envy
- (TroelsL) Update Divine Living Rune initiative statistic

## 8.0.3

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
- (Ambrose) Add inline rolls to Eagle Knight dedication
- (Ambrose) Remove Prepared Spellcasting entry for Adult Requiem Dragon (non-spellcasting variant)
- (Dire Weasel) Add supplemental area information to Frigid Flurry description

## 8.0.2

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

- (Ambrose) Add automation to Commitment to Protection feat
- (Ambrose) Add missing defenses to The Bloodstorm actor
- (Ambrose) Add notes to Evangelize feat
- (Ambrose) Consolidate Evasiveness Archetype feat
- (Ambrose) Consolidate Skill Mastery archetype feats
- (Dantar) Automate Sanguine Tenacity's Drained mechanics
- (Dantar) Make Arghun unique
- (kromko) Add missing Hellfire Dispatches localization strings

## 8.0.1

### Bugfixes

- (In3luki) Fix detection of inline damage rolls
- (In3luki) Fix Region shape resetting after release of shape control handles
- (In3luki) Fix localization of check-roll message flavor with static DCs
- (stwlam) Fix style incapability with V14 code-mirror elements in Note Rule Element form
- (stwlam) Fix issue preventing changing viewed scene
- (stwlam) Restore styling of inline roll links according to roll (now message) mode

### Data Updates

- (Ambrose) Correct Shadow Maze's Disorient action type to reaction
- (Dantar) Align the implementation of Bless spell effect with Benediction

## 8.0.0

### Bugfixes

- (stwlam, Supe, In3luki) Update to support V14

### Data Updates

- (Ambrose) Add notes RE to Disturbing Knowledge feat
- (Dantar) Fix Ammunition RE applying to Combination Weapons
- (Tikael) Remove trailing semicolon from ritual costs
