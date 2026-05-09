## 8.1.2

### System Improvements

- (stwlam) Add "robot" trait to creature identification

### Bugfixes

- (jfn4th) Refresh token bars on Temp HP updates.
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

- (Dantar) Fix precision immunity crit damage miscalculation
- (Dantar) Apply holy/unholy to sanctified NPC attacks
- (jfn4th) Fix updating scene darkness via darkness adjuster tool
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
