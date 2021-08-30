export {};

declare global {
    interface ElementDragEvent extends DragEvent {
        target: HTMLElement;
        currentTarget: HTMLElement;
        readonly dataTransfer: DataTransfer;
    }

    type DeepPartial<T> = {
        [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
    };

    type ConstructorOf<T> = new (...args: any[]) => T;
}
