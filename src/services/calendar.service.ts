export interface AvailabilityRule {
    timeZone: string;
    workingHours: Array<{ day: number; start: string; end: string }>;
    slotDurationMinutes: number;
    minLeadMinutes?: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    allowOverlapping?: boolean;
}


export interface BookingRequest {
    calendarId: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    attendees?: { email: string; optional?: boolean }[];
    metadata?: Record<string, unknown>;
}

export class CalendarService {

    constructor(private readonly providerResolver: () => Promise<ICalendarProvider>) {}

    async getAvailableSlots(params: {
        calendarId: string;
        rangeStart: Date;
        rangeEnd: Date;
        rule: AvailabilityRule;
    }): Promise<Date[]> {   
        const provider = await this.providerResolver();
        return provider.getAvailableSlots(params);
    }

    async book(params: BookingRequest): Promise<{ id: string }> {
        const provider = await this.providerResolver();
        return provider.book(params);
    }

    async findNextAvailable(params: {
        calendarId: string;
        after: Date;
        rule: AvailabilityRule;
    }): Promise<Date | null> {
        const provider = await this.providerResolver();
        return provider.findNextAvailable(params);
    }
}