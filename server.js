require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const flash = require('connect-flash');
const helmet = require('helmet');
const methodOverride = require('method-override');
const path = require('path');

const { sessionOptions, testConnection } = require('./src/db');
const { attachLocals } = require('./src/middleware/auth');

const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const taskRoutes = require('./src/routes/tasks');
const calendarRoutes = require('./src/routes/calendar');
const clockRoutes = require('./src/routes/clock');
const visitRoutes = require('./src/routes/visits');
const competencyRoutes = require('./src/routes/competency');
const ledgerRoutes = require('./src/routes/pay-ledger');
const domainRoutes = require('./src/routes/domains');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    key: 'mission_property_tracker.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-change-me',
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore(sessionOptions),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use(flash());
app.use(attachLocals);

app.get('/', (req, res) => {
  res.redirect(req.session.user ? '/dashboard' : '/login');
});

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/tasks', taskRoutes);
app.use('/calendar', calendarRoutes);
app.use('/clock', clockRoutes);
app.use('/visits', visitRoutes);
app.use('/competency', competencyRoutes);
app.use('/pay-ledger', ledgerRoutes);
app.use('/domains', domainRoutes);

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  req.flash('error', err.message || 'Something went wrong.');
  res.status(500).render('errors/500', { title: 'Server Error' });
});

app.listen(port, () => {
  console.log(`Mission Property Tracker running at http://localhost:${port}`);
  testConnection()
    .then(() => {
      console.log('Database connection verified.');
    })
    .catch((error) => {
      console.error('Database connection failed:', error.message);
    });
  });
