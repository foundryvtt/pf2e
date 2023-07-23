import type { ClientBaseScene } from "./client-base-mixes.d.ts";

declare global {
    // Interfaces for ClientDocuments, given there is no common base with the generated intermediate classes
    interface ClientDocument extends foundry.abstract.Document {
        name?: string | null;

        get hasPlayerOwner(): boolean;
        get isOwner(): boolean;
        get sheet(): FormApplication;
        get uuid(): DocumentUUID;
    }

    interface CanvasDocument extends ClientDocument {
        readonly parent: ClientBaseScene | null;
        hidden?: boolean;
    }
}
