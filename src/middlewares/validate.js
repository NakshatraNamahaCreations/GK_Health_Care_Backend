// Zod request validator. Pass an object: { body, query, params }.
// Each property is a Zod schema and the corresponding req.* is replaced with the parsed result.
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    return next();
  } catch (err) {
    return next(err); // ZodError is normalized in global errorHandler
  }
};

module.exports = validate;
