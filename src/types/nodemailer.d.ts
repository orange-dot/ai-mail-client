declare module "nodemailer" {
  export type SendMailOptions = {
    from?: string;
    to?: string;
    cc?: string;
    subject?: string;
    text?: string;
  };

  export type SentMessageInfo = {
    messageId: string;
  };

  export type Transporter = {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
  };

  export type TransportOptions = {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  export function createTransport(options: TransportOptions): Transporter;
}
