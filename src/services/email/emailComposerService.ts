import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';

import {
  formatDefaultSubject,
  formatSignature,
  RecipientResolution,
  resolveRecipient,
} from './emailFormatting';
import { errorLogger } from '@/services/logging/errorLogger';

export { formatDefaultSubject, formatSignature, RecipientResolution, resolveRecipient };

export const emailComposerService = {
  resolveRecipient,
  formatDefaultSubject,
  formatSignature,

  /**
   * Opens the user's default Android email application with To, Subject, Body, and PDF attachment.
   */
  async openEmailApp(options: {
    recipient: string;
    subject: string;
    body: string;
    signature: string;
    attachmentUri?: string | null;
  }): Promise<{ success: boolean; method: 'composer' | 'fallback_mailto' | 'fallback_share' }> {
    const fullBody = `${options.body.trim()}\n\n${options.signature.trim()}`;

    // Verify attachment file exists and ensure proper file:// protocol
    let attachmentFilePath: string | undefined = undefined;
    if (options.attachmentUri) {
      try {
        const fileUri = options.attachmentUri.startsWith('file://')
          ? options.attachmentUri
          : `file://${options.attachmentUri}`;

        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          attachmentFilePath = fileUri;
        } else {
          console.warn('Attachment file does not exist at path:', fileUri);
        }
      } catch (err) {
        await errorLogger.logError('emailComposerService.verifyAttachment', err, {
          attachmentUri: options.attachmentUri,
        });
      }
    }

    // 1. Try official native MailComposer
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: options.recipient ? [options.recipient] : [],
          subject: options.subject,
          body: fullBody,
          attachments: attachmentFilePath ? [attachmentFilePath] : [],
        });
        return { success: true, method: 'composer' };
      }
    } catch (err) {
      await errorLogger.logError('emailComposerService.MailComposer', err, {
        recipient: options.recipient,
        attachment: attachmentFilePath,
      });
      console.warn('MailComposer failed, attempting mailto/share fallback:', err);
    }

    // 2. Fallback: standard mailto URL
    const mailtoUrl = `mailto:${encodeURIComponent(options.recipient)}?subject=${encodeURIComponent(
      options.subject
    )}&body=${encodeURIComponent(fullBody)}`;

    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);

      // If there's an attachment, also trigger share so user can attach it
      if (attachmentFilePath && (await Sharing.isAvailableAsync())) {
        setTimeout(async () => {
          try {
            await Sharing.shareAsync(attachmentFilePath!, {
              mimeType: 'application/pdf',
              dialogTitle: 'Attach Resume PDF',
            });
          } catch (shareErr) {
            await errorLogger.logError('emailComposerService.fallbackShare', shareErr);
          }
        }, 800);
      }
      return { success: true, method: 'fallback_mailto' };
    }

    // 3. Fallback: Sharing sheet with PDF
    if (attachmentFilePath && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(attachmentFilePath, {
        mimeType: 'application/pdf',
        dialogTitle: `Application: ${options.subject}`,
      });
      return { success: true, method: 'fallback_share' };
    }

    throw new Error('No compatible email client or sharing handler found on this device.');
  },
};
