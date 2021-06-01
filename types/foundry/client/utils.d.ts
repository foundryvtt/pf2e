declare interface ElementDragEvent extends DragEvent {
    target: HTMLElement;
    currentTarget: HTMLElement;
    readonly dataTransfer: DataTransfer;
}

declare type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

declare type ConstructorOf<T> = new (...args: any[]) => T;
