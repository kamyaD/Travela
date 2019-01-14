import mail from 'mailgun-js';
import dotenv from 'dotenv';
import models from '../../database/models';
import mailTemplate from '../../helpers/email/mailTemplate';

dotenv.config();

export default class NotificationEngine {
  static async notify(data) {
    const dataKeys = Object.keys(data);
    /* istanbul ignore next */

    if (dataKeys.length < 1) {
      return false;
    }
    const validKeys = ['senderId', 'recipientId', 'notificationType',
      'message', 'notificationLink',
      'senderName', 'senderImage'];
    const validateData = validKeys.map((value) => {
      if (dataKeys.includes(value) === false) {
        return false;
      }
      return true;
    });
    /* istanbul ignore next */
    if (validateData === false) {
      return false;
    }
    const notification = {
      ...data,
      notificationStatus: 'unread',
    };
    const newNotification = await models.Notification.create(notification);
    global.io.sockets.emit('notification', newNotification);
  }

  static dispatchEmail(mailData) {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      const mailgun = mail({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN_NAME
      });
      mailgun.messages().send(mailData);
    }
    return false;
  }

  static sendMail({
    recipient, sender, topic, type, redirectLink, requestId, comment, details, picture
  }) {
    const data = {
      from: `Travela <${process.env.MAIL_SENDER}>`,
      to: `${recipient.email}`,
      subject: topic,
      details,
      html: mailTemplate(
        {
          recipientName: recipient.name,
          senderName: sender,
          type,
          redirectLink,
          requestId,
          comment,
          details,
          picture
        }
      )
    };
    NotificationEngine.dispatchEmail(data);
  }

  static prepareMultipleReceipients(recipients) {
    const recipientVars = {};
    const emails = recipients.map((recipient) => {
      recipientVars[recipient.email] = {
        name: recipient.fullName,
      };
      return recipient.email;
    });
    return { emails, recipientVars };
  }

  static sendMailToMany(recipients, data) {
    const { emails, recipientVars } = NotificationEngine.prepareMultipleReceipients(recipients);
    const destination = '';
    const mailData = {
      from: `Travela <${process.env.MAIL_SENDER}>`,
      to: emails,
      subject: data.topic,
      html: mailTemplate(
        {
          recipientName: '%recipient.name%',
          senderName: data.sender,
          type: data.type,
          redirectLink: data.redirectLink,
          requestId: data.requestId,
          comment: data.comment,
          guesthouseName: data.guesthouseName,
          checkInTime: data.checkInTime,
          durationOfStay: data.durationOfStay,
          destination,
          checkoutTime: data.checkoutTime,
        }
      ),
      'recipient-variables': recipientVars,
    };

    NotificationEngine.dispatchEmail(mailData);
  }
}
