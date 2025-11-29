const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('./laundry.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(date, time_slot)
    )
  `);
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign(
          { id: this.lastID, username, email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
});

app.get('/api/bookings', authenticateToken, (req, res) => {
  const { date } = req.query;

  if (date) {
    db.all(
      'SELECT * FROM bookings WHERE date = ? AND status = "active"',
      [date],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching bookings' });
        }
        res.json(rows);
      }
    );
  } else {
    db.all(
      'SELECT * FROM bookings WHERE user_id = ? AND status = "active"',
      [req.user.id],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching bookings' });
        }
        res.json(rows);
      }
    );
  }
});

app.post('/api/bookings', authenticateToken, (req, res) => {
  const { date, slots } = req.body;

  if (!date || !slots || !Array.isArray(slots)) {
    return res.status(400).json({ error: 'Date and slots array are required' });
  }

  if (slots.length === 0 || slots.length > 2) {
    return res.status(400).json({ error: 'You must book 1-2 slots' });
  }

  db.get(
    'SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND date = ? AND status = "active"',
    [req.user.id, date],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking existing bookings' });
      }

      const existingCount = result.count;
      const totalSlots = existingCount + slots.length;

      if (totalSlots > 2) {
        return res.status(400).json({
          error: `You can only book 2 slots per day. You already have ${existingCount} slot(s) booked.`
        });
      }

      const stmt = db.prepare(
        'INSERT INTO bookings (user_id, date, time_slot) VALUES (?, ?, ?)'
      );

      let successCount = 0;
      let errors = [];

      slots.forEach((slot, index) => {
        stmt.run([req.user.id, date, slot], function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              errors.push(`Slot ${slot} is already booked`);
            } else {
              errors.push(`Error booking slot ${slot}`);
            }
          } else {
            successCount++;
          }

          if (index === slots.length - 1) {
            stmt.finalize();

            if (successCount === 0) {
              res.status(409).json({ error: 'No slots were booked', details: errors });
            } else if (errors.length > 0) {
              res.status(207).json({
                message: `${successCount} slot(s) booked successfully`,
                warnings: errors
              });
            } else {
              res.status(201).json({ message: 'All slots booked successfully' });
            }
          }
        });
      });
    }
  );
});

app.delete('/api/bookings/:id', authenticateToken, (req, res) => {
  const bookingId = req.params.id;

  db.run(
    'UPDATE bookings SET status = "cancelled" WHERE id = ? AND user_id = ?',
    [bookingId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error cancelling booking' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      res.json({ message: 'Booking cancelled successfully' });
    }
  );
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
