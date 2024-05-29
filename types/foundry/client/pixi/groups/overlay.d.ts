export {};

declare global {
    class OverlayCanvasGroup extends CanvasGroup {
        static override groupName: "overlay";
    }
}
