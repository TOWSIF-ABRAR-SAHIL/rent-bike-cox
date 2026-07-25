function requireOwnership(model, paramName = 'id', userIdPath = 'renter') {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.status(400).json({ message: 'Resource ID is required' });
      }

      const resource = await model.findById(resourceId).select(userIdPath);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      const ownerId = resource[userIdPath];
      if (!ownerId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (req.user.role === 'Admin') {
        req.resource = resource;
        return next();
      }

      if (ownerId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Authorization check failed' });
    }
  };
}

module.exports = requireOwnership;
