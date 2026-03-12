# Health Monitoring Mobile App

A React Native mobile application for field workers to collect health data in rural areas with offline-first capabilities.

## Features

- **Offline-First**: Works without internet connection, syncs when online
- **Bilingual Support**: English and Marathi languages
- **Patient Registration**: Register new patients with basic information
- **Health Data Collection**: Record symptoms, vital signs, and notes
- **Camera Integration**: Capture photos of health documents
- **AI Analysis**: Automatic health risk assessment via Grok API
- **Real-time Sync**: Automatic synchronization with Supabase backend

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI: `npm install -g @expo/cli`
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Supabase:
   - Update `services/supabase.ts` with your Supabase URL and anon key
   - Ensure your Supabase project has the required tables (see `../dbschema.sql`)

3. Configure Grok API:
   - Update `services/ai.ts` with your Grok API key
   - Sign up at https://x.ai/ to get an API key

### Running the App

1. Start the Expo development server:
   ```bash
   npm start
   ```

2. Use Expo Go app on your phone to scan the QR code, or:
   - Press `a` for Android emulator
   - Press `i` for iOS simulator

### Building for Production

1. Build for Android:
   ```bash
   expo build:android
   ```

2. Build for iOS:
   ```bash
   expo build:ios
   ```

## Project Structure

```
mobile/
├── services/          # Core services
│   ├── database.ts    # SQLite offline database
│   ├── supabase.ts    # Supabase client
│   ├── sync.ts        # Offline-to-online sync
│   ├── ai.ts          # Grok AI integration
│   ├── camera.ts      # Camera and media handling
│   └── i18n.ts        # Internationalization
├── screens/           # App screens
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx
│   ├── PatientRegistrationScreen.tsx
│   └── HealthDataScreen.tsx
├── context/           # React contexts
│   └── AuthContext.tsx
└── App.tsx           # Main app component
```

## Key Features

### Offline Database
- Uses SQLite for local data storage
- Automatic sync when internet is available
- Tracks sync status for each record

### Health Data Collection
- Symptom tracking with smart validation
- Vital signs recording (temperature, BP, heart rate)
- Photo attachments for documentation
- Additional notes and observations

### AI Integration
- Automatic risk assessment using Grok API
- Generates recommendations based on symptoms
- Fallback analysis when API is unavailable
- Confidence scoring for reliability

### Sync Engine
- Background synchronization every 5 minutes
- Manual sync option for immediate upload
- Error handling and retry logic
- Sync status indicators

## Configuration

### Environment Variables
Create a `.env` file with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GROK_API_KEY=your_grok_api_key
```

### Permissions
The app requires the following permissions:
- Camera access (for document photos)
- Storage access (for saving photos)
- Network access (for sync)

## Troubleshooting

### Common Issues

1. **Camera not working**: Ensure camera permissions are granted
2. **Sync failing**: Check internet connection and Supabase configuration
3. **App crashes on startup**: Verify all dependencies are installed

### Debug Mode
Enable debug logging by setting:
```javascript
console.log('Debug mode enabled');
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.