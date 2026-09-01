import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { errorLogger } from '@/services/logging/errorLogger';

export const pdfViewerService = {
  /**
   * Opens the local PDF file directly in the device's native PDF Viewer (ACTION_VIEW on Android).
   * Does NOT trigger the generic "Share with" dialog on Android.
   */
  async openPdf(filePath: string): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(filePath);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          type: 'application/pdf',
          flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
        });
        return;
      }

      // iOS & Web fallback
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open Resume PDF',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (err: any) {
      await errorLogger.logError('pdfViewerService.openPdf', err, { filePath });
      // If IntentLauncher fails for any reason (e.g. no default PDF app), fallback to Sharing
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/pdf',
            dialogTitle: 'Open Resume PDF',
            UTI: 'com.adobe.pdf',
          });
        }
      } catch (fallbackErr: any) {
        throw new Error(err.message || 'Unable to open PDF viewer on this device.');
      }
    }
  },
};
