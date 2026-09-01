import * as FileSystem from 'expo-file-system/legacy';

export const errorLogger = {
  /**
   * Returns the absolute path of the persistent error log file inside hireFlow/logs/.
   */
  getLogFilePath(): string {
    return `${FileSystem.documentDirectory}hireFlow/logs/error.log`;
  },

  /**
   * Logs an error with timestamp, context, message, and stack trace to hireFlow/logs/error.log.
   */
  async logError(
    context: string,
    error: any,
    extraData?: Record<string, any>
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';

    const logEntry = [
      `[${timestamp}] [${context.toUpperCase()}] ERROR: ${errorMessage}`,
      stack ? `STACK: ${stack}` : null,
      extraData && Object.keys(extraData).length > 0
        ? `EXTRA: ${JSON.stringify(extraData)}`
        : null,
      '--------------------------------------------------------------------------------\n',
    ]
      .filter(Boolean)
      .join('\n');

    // Also print to console for live ADB and Metro debugging
    console.error(`[${context}]`, errorMessage, error);

    try {
      const logsDir = `${FileSystem.documentDirectory}hireFlow/logs/`;
      const dirInfo = await FileSystem.getInfoAsync(logsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(logsDir, { intermediates: true });
      }

      const filePath = this.getLogFilePath();
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists) {
        // Read existing content and append new entry (preventing file from growing beyond 1MB)
        const existingContent = await FileSystem.readAsStringAsync(filePath);
        const trimmedContent =
          existingContent.length > 1000000
            ? existingContent.slice(-500000)
            : existingContent;

        await FileSystem.writeAsStringAsync(
          filePath,
          trimmedContent + logEntry,
          { encoding: FileSystem.EncodingType.UTF8 }
        );
      } else {
        await FileSystem.writeAsStringAsync(filePath, logEntry, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }
    } catch (fsErr) {
      console.warn('Failed to write to error log file:', fsErr);
    }
  },

  /**
   * Reads all recorded error logs.
   */
  async readLogs(): Promise<string> {
    try {
      const filePath = this.getLogFilePath();
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return 'No error logs recorded.';
      }
      return await FileSystem.readAsStringAsync(filePath);
    } catch (err) {
      return `Failed to read log file: ${String(err)}`;
    }
  },

  /**
   * Clears the error log file.
   */
  async clearLogs(): Promise<void> {
    try {
      const filePath = this.getLogFilePath();
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (err) {
      console.warn('Failed to clear log file:', err);
    }
  },
};
