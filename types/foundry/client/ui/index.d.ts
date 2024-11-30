import "./context.d.ts";
import "./dialog.d.ts";
import "./dragdrop.d.ts";
import "./editor.d.ts";
import "./filepicker.d.ts";
import "./notifications.d.ts";
import "./prosemirror.d.ts";
import "./secrets.d.ts";
import "./tabs.d.ts";
import "./tooltip.d.ts";
import "./tour.d.ts";

declare global {
    interface FoundryUI<
        TActorDirectory extends foundry.applications.sidebar.tabs.ActorDirectory<Actor<null>>,
        TItemDirectory extends ItemDirectory<Item<null>>,
        TChatLog extends ChatLog,
        TCompendiumDirectory extends CompendiumDirectory,
        TCombatTracker extends CombatTracker<Combat | null>,
        THotbar extends foundry.applications.ui.Hotbar<Macro>,
    > {
        actors: TActorDirectory;
        chat: TChatLog;
        combat: TCombatTracker;
        compendium: TCompendiumDirectory;
        controls: foundry.applications.ui.SceneControls;
        items: TItemDirectory;
        notifications: Notifications;
        settings: Settings;
        sidebar: Sidebar;
        tables: RollTableDirectory;
        windows: Record<number, Application>;
        hotbar: THotbar;
        nav: SceneNavigation;
    }
}
