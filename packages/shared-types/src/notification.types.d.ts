import type { UUID, ISODateString } from './common.types';
export type NotificationChannel = 'Email' | 'SMS' | 'Webhook' | 'Slack';
export interface EmailTemplate {
    id: UUID;
    name: string;
    slug: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    variables: string[];
    isSystem: boolean;
    version: number;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
export interface NotificationLog {
    id: UUID;
    clientId?: UUID;
    channel: NotificationChannel;
    recipient: string;
    templateSlug?: string;
    subject?: string;
    body: string;
    status: 'Queued' | 'Sent' | 'Delivered' | 'Failed' | 'Bounced';
    errorMessage?: string;
    sentAt?: ISODateString;
    createdAt: ISODateString;
}
//# sourceMappingURL=notification.types.d.ts.map