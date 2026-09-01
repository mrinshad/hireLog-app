# HireLog 📄🚀

**HireLog** is an intelligent, privacy-first mobile application designed to streamline job applications with AI-assisted job description analysis, truthful ATS resume tailoring, 100% on-device PDF compilation, and seamless 1-tap email application workflows.

---

## Key Features

- **Automated JD Analysis**: Extracts roles, required/preferred skills, salary ranges, and application emails using Google Gemini.
- **Truthful ATS Resume Customizer**: Renders tailored resumes based on verified candidate profile data with zero fabrication.
- **100% Offline On-Device PDF Generator**: Compiles publication-quality A4 vector PDFs natively in ~150ms with zero network dependency, saving to `hireFlow/resumes/`.
- **Android Content URI Email Attachment**: Prepares email drafts and attaches resumes across Android sandbox boundaries directly into Gmail, Outlook, or Samsung Mail.
- **Dynamic API Keys & AI Models Catalog**: Configure multiple Gemini API keys and register custom models dynamically from SQLite.
- **Native Biometric & Security Lock**: Protects API keys and sensitive configuration with native Android Fingerprint, Face ID, PIN, Pattern, or Password authentication.
- **Local SQLite Architecture**: All profiles, job applications, resume versions, and email drafts remain on your device (`hirelog.db`).
- **Android Quick Apply Widget**: Native home screen widget for 1-tap job capture.

---

## 🛠️ Prerequisites

1. **Node.js**: `v18+` or `v20+`
2. **Android SDK & Platform Tools**:
   Ensure `adb` is in your terminal PATH:
   ```bash
   echo 'export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

---

## 🚀 Terminal Commands & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Live Development (Hot-Reloading)
Starts the local Metro bundler for real-time live reloading on your phone:
```bash
npx expo start
```
- Press `a` in the terminal to connect to an attached Android device.
- Press `r` to reload the bundle.

---

### 3. Wireless Debugging (No Cable Needed)

Connect your Android phone wirelessly over the same Wi-Fi network:

1. **On your phone**: Go to **Settings** → **Developer options** → **Wireless debugging** → **Pair device with pairing code**.
2. **Pair with your Mac** (one-time setup):
   ```bash
   adb pair <PHONE_IP>:<PAIRING_PORT> <PAIRING_CODE>
   ```
3. **Connect**:
   ```bash
   adb connect <PHONE_IP>:<MAIN_PORT>
   ```
4. **Verify connection**:
   ```bash
   adb devices
   ```

---

### 4. Build & Install Standalone Production APK

Build a local, minified ARM64 production APK and install it to your connected device in one command:

```bash
# Compile standalone release APK
npm run build:apk

# Compile and automatically install over Wi-Fi
npm run build:apk && adb install -r hirelog-production.apk
```

Output APK location:
`./hirelog-production.apk` (Size: ~34MB)

---

### 5. Live Device Logs
To view `console.log`, network events, and app runtime logs live in your terminal:
```bash
adb logcat -s ReactNativeJS:V
```

---

## 🧪 Testing & Validation

Run all TypeScript checks and automated test suites:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Dynamic API keys & models test
npx tsx scripts/run-api-key-tests.ts

# 3. Workflow orchestration & approval gate test
npx tsx scripts/run-workflow-tests.ts

# 4. Comprehensive system audit (Scenarios A through X)
npx tsx scripts/run-all-audit-tests.ts

# 5. Predefined profile seeder verification
npx tsx scripts/run-profile-seeder-tests.ts
```

---

## 📁 Project Architecture

```text
hireLog/
├── android/                   # Native Android project & widget source
├── assets/                    # Official branding & app icons
├── plugins/                   # Custom Expo config plugins (Widget support)
├── scripts/                   # Test runners & APK build pipeline
│   └── build-apk.sh           # Local Gradle build script
└── src/
    ├── app/                   # Expo Router screens & tab navigation
    │   ├── (tabs)/            # Home, Jobs, Resumes, Profile, Settings
    │   ├── jobs/              # Job detail, resume review, email review
    │   ├── resumes/           # Resume library details
    │   └── settings/api-keys  # Dynamic API keys & models manager
    ├── components/            # Reusable UI components & resume document sheet
    ├── constants/             # Design tokens, theme colors, typography
    ├── context/               # Dialog & Toast provider
    ├── database/              # SQLite migrations, database singleton & repositories
    ├── services/              # Gemini, matching engine, PDF generator, email composer
    └── types/                 # TypeScript interfaces (Job, Profile, Resume, etc.)
```

---

## 📄 License
MIT License. Created for ByteN.
