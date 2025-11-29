# Laundry Booking App

A React Native mobile application with Express backend for booking laundry time slots.

## Features

- Calendar view for date selection
- Time slot booking (1-hour slots from 8 AM to 6 PM)
- Maximum 2 slots per user per day
- User authentication (JWT-based)
- SQLite database for data storage
- Works on iOS, Android, and Web

## Tech Stack

**Frontend:**
- React Native with Expo
- react-native-calendars for calendar UI
- Axios for API calls

**Backend:**
- Node.js with Express
- SQLite database
- JWT authentication
- bcrypt for password hashing

## Project Structure

```
laundry_app/
├── src/
│   ├── screens/
│   │   └── BookingScreen.js    # Main booking interface
│   ├── components/
│   └── services/
├── backend/
│   ├── server.js               # Express server
│   ├── laundry.db             # SQLite database (auto-generated)
│   └── .env.example           # Environment variables template
├── App.js                      # Root component
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. **Clone and install frontend dependencies:**
```bash
npm install
```

2. **Install backend dependencies:**
```bash
cd backend
npm install
```

3. **Set up environment variables:**
```bash
cd backend
cp .env.example .env
# Edit .env and set your JWT_SECRET
```

### Running the Application

1. **Start the backend server:**
```bash
cd backend
npm start
```
The server will run on http://localhost:3000

2. **In a new terminal, start the Expo app:**
```bash
npm start
```

3. **Run on your device:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app on your phone

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Bookings
- `GET /api/bookings` - Get user's bookings (requires auth)
- `GET /api/bookings?date=YYYY-MM-DD` - Get bookings for specific date
- `POST /api/bookings` - Create new booking (requires auth)
- `DELETE /api/bookings/:id` - Cancel booking (requires auth)

### Health Check
- `GET /api/health` - Check server status

## Usage

1. Open the app on your device
2. Select a date from the calendar
3. Choose 1-2 available time slots
4. Click "Book" to confirm your booking
5. View your booked slots

## Current Implementation

The current version has:
- Basic booking UI without authentication
- Calendar integration
- Time slot selection with 2-slot limit
- Alert-based confirmation

## Next Steps

To integrate with the backend:

1. Add authentication screens (Login/Register)
2. Connect BookingScreen to backend API
3. Implement AsyncStorage for token management
4. Add booking history view
5. Add ability to cancel bookings

## Development Notes

- The app currently runs standalone without authentication
- Backend is ready but not yet integrated with frontend
- Database is created automatically on first run
- All times are in 1-hour slots

## License

ISC
