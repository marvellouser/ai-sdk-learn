declare module 'nodemailer' {
  export type SendMailResult = {
    messageId: string;
    accepted: unknown;
    rejected: unknown;
  };

  export type SendMailOptions = {
    from?: string;
    to?: string;
    subject?: string;
    html?: string;
    text?: string;
  };

  export type Transporter = {
    sendMail(options: SendMailOptions): Promise<SendMailResult>;
  };

  export function createTransport(options: unknown): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
