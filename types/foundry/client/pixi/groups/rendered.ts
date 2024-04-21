export {};

declare global {
    class RenderedCanvasGroup extends CanvasGroup {
        static override groupName: "rendered";
    }
}
