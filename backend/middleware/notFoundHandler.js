function notFoundHandler(req, res) {
  res.status(404).json({ message: 'API endpoint not found' });
}

module.exports = notFoundHandler;
