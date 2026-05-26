import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private mailer: any;

  constructor(private readonly configService: ConfigService) {
    this.initMailer();
  }

  private initMailer() {
    try {
      this.mailer = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });
    } catch (err) {
      this.logger.warn('Email mailer not configured');
    }
  }

  async sendAlert(subject: string, message: string, severity: string = 'info'): Promise<void> {
    await Promise.allSettled([
      this.sendEmail(subject, message),
      this.sendTelegram(subject, message),
      this.sendSlack(subject, message, severity),
    ]);
  }

  async sendEmail(subject: string, message: string, to?: string): Promise<void> {
    const recipient = to || this.configService.get('SMTP_USER');
    if (!recipient || !this.mailer) return;

    try {
      await this.mailer.sendMail({
        from: this.configService.get('SMTP_FROM', 'NSE Analytics <noreply@nse.com>'),
        to: recipient,
        subject: `[NSE Analytics] ${subject}`,
        text: message,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1a56db;">${subject}</h2>
          <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px;">${message}</pre>
          <p style="color: #666; font-size: 12px;">NSE Market Analytics Platform</p>
        </div>`,
      });
    } catch (err) {
      this.logger.error(`Email send failed: ${err.message}`);
    }
  }

  async sendTelegram(title: string, message: string): Promise<void> {
    const token = this.configService.get('TELEGRAM_BOT_TOKEN');
    const chatId = this.configService.get('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    try {
      const text = `📊 *${title}*\n\n${message}`;
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });
    } catch (err) {
      this.logger.error(`Telegram send failed: ${err.message}`);
    }
  }

  async sendSlack(title: string, message: string, severity = 'info'): Promise<void> {
    const webhookUrl = this.configService.get('SLACK_WEBHOOK_URL');
    if (!webhookUrl) return;

    const colors: Record<string, string> = { error: '#e53e3e', high: '#f6ad55', info: '#63b3ed', success: '#68d391' };

    try {
      await axios.post(webhookUrl, {
        attachments: [{
          color: colors[severity] || colors.info,
          title,
          text: message,
          footer: 'NSE Market Analytics',
          ts: Math.floor(Date.now() / 1000),
        }],
      });
    } catch (err) {
      this.logger.error(`Slack send failed: ${err.message}`);
    }
  }
}
