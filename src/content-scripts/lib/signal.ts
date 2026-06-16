import PageLive from '../pagelive';

/**
 * This class handles signal to user, such as busy signal
 */
export default class Signal {
    private pl: PageLive;

    // This class can accepts multiple request to indicate busy state. However there can only 1 busy signal presented to user. This is meant to avoid crowded noise to user.
    // Every 'busy' request will have a `busyId`. When no longer `busyId` registered, 'vusy' state will be stopped.
    private busyIds: number[] = [];
    private nextBusyId = 0;
    // Interval used to singal 'busy' state
    private busyIntervalId: ReturnType<typeof setInterval> | null = null;

    constructor(pl: PageLive) {
        this.pl = pl;
    }
    /**
     * Start Register  as busy. This will invoke 'busy' state if not yet started.
     * @return number The id to signal that this process no longer busy. 
     */
    async busy(): Promise<number> {
        this.nextBusyId++;
        this.busyIds.push(this.nextBusyId);
        this.evaluteBusyState();
        return this.nextBusyId;
    }

    /**
     * Stop busy signal
     */
    async busyStop(busyId: number) {
        for (let i = 0; i < this.busyIds.length; i++) {
            if (this.busyIds[i] === busyId) {
                this.busyIds.splice(i, 1);
                break;
            }
        }
        this.evaluteBusyState();
    }

    /**
     * Execute actions based on the 'busy' state
     */
    private evaluteBusyState() {
        // Is transitioning to 'busy' state ?
        if (this.busyIntervalId === null
            && this.busyIds.length > 0
        ) {
            this.pl.speak('Loading.');
            this.busyIntervalId = setInterval(() => {
                this.pl.speak('Loading.');
            }, 5e3);
        } else if (this.busyIntervalId !== null
            && this.busyIds.length === 0
        ) {
            // Transitioning to 'not busy'
            clearInterval(this.busyIntervalId);
            this.busyIntervalId = null;
        }
    }
}