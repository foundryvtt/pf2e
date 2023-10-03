import "./context.d.ts";
import "./dialog.d.ts";
import "./drag-drop.d.ts";
import "./editor.d.ts";
import "./filepicker.d.ts";
import "./notifications.d.ts";
import "./tabs.d.ts";
import "./tooltip.d.ts";
import "./tour.d.ts";

declare global {
    interface FoundryUI<
        TActorDirectory extends ActorDirectory<Actor<null>>,
        TItemDirectory extends ItemDirectory<Item<null>>,
        TChatLog extends ChatLog,
        TCompendiumDirectory extends CompendiumDirectory,
        TCombatTracker extends CombatTracker<Combat | null>
    > {
        actors: TActorDirectory;
        chat: TChatLog;
        combat: TCombatTracker;
        compendium: TCompendiumDirectory;
        controls: SceneControls;
        items: TItemDirectory;
        notifications: Notifications;
        settings: Settings;
        sidebar: Sidebar;
        tables: RollTableDirectory;
        windows: Record<number, Application>;
    }
}
