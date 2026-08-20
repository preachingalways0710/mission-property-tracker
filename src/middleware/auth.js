function attachLocals(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.isAdmin = req.session.user?.role === 'admin';
  res.locals.isWorker = req.session.user?.role === 'worker';
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.path = req.path;
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please sign in to continue.');
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      req.flash('error', 'You do not have access to that page.');
      return res.redirect('/dashboard');
    }
    next();
  };
}

module.exports = { attachLocals, requireAuth, requireRole };
