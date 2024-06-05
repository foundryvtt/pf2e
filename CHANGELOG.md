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
