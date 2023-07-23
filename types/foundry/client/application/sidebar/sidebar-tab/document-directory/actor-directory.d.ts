export {};

declare global {
    /** The sidebar directory which organizes and displays world-level Actor documents. */
    class ActorDirectory<TActor extends Actor<null>> extends DocumentDirectory<TActor> {
        constructor(options: SidebarDirectoryOptions);

        static override documentName: "Actor";

        protected override _canDragStart(selector: string): boolean;

        protected override _onDragStart(event: ElementDragEvent): void;

        protected override _canDragDrop(selector: string): boolean;

        protected override _getEntryContextOptions(): EntryContextOption[];
    }
}
