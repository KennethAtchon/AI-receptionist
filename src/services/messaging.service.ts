import { ICommunicationProvider } from "../types/communication";

export class MessagingService {
    constructor(private readonly providerResolver: () => Promise<ICommunicationProvider>) {}

    async sendTemplatedSMS(params: {
        to: string;
        templateId: string;
        variables: Record<string, string>;
        track?: boolean;
    }): Promise<{ id: string }> {
        // TODO: Implement
        return { id: '123' };
    }
}