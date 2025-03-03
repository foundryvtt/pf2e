/**
 * The Camera UI View that displays all the camera feeds as individual video elements.
 */
declare class CameraViews extends Application {
    /**
     * A reference to the master AV orchestrator instance
     */
    get webrtc(): object; // TODO AVMaster needs type

    /**
     * If all camera views are popped out, hide the dock.
     */
    get hidden(): boolean;

    /**
     * Obtain a reference to the div.camera-view which is used to portray a given Foundry User.
     * @param userId The ID of the User document
     */
    getUserCameraView(userId: string): HTMLElement | null;

    /**
     * Obtain a reference to the video.user-camera which displays the video channel for a requested Foundry User.
     * If the user is not broadcasting video this will return null.                                               @param userId The ID of the User document
     */
    getUserVideoElement(userId: string): HTMLVideoElement | null;

    /**
     * Sets whether a user is currently speaking or not
     *
     * @param userId The ID of the user
     * @param speaking Whether the user is speaking
     */
    setUserIsSpeaking(userId: string, speaking: boolean): void;
}
