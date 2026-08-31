import * as LocalAuthentication from 'expo-local-authentication';

export const deviceAuthService = {
  /**
   * Checks if native device authentication (biometrics, PIN, Password, Pattern) is available.
   */
  async isAuthAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  },

  /**
   * Prompts native Android biometric or device credentials lock (PIN, Password, Pattern, Fingerprint, Face).
   */
  async promptNativeAuth(
    promptTitle: string = 'Security Verification'
  ): Promise<{ success: boolean; fallbackNeeded?: boolean; error?: string }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Device lacks enrolled biometrics / screen lock; fallback to app PIN modal
        return { success: false, fallbackNeeded: true };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptTitle,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Device PIN / Password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      if (result.error === 'user_cancel' || result.error === 'app_cancel') {
        return { success: false, error: 'Authentication cancelled' };
      }

      return { success: false, fallbackNeeded: true, error: result.warning || result.error };
    } catch (err: any) {
      console.warn('Native biometric error, falling back:', err);
      return { success: false, fallbackNeeded: true, error: err.message };
    }
  },
};
