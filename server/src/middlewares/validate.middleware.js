import { ZodError } from "zod";
import { AppError } from "../shared/errors/AppError.js";

/**
 * Reusable Zod validation middleware.
 * Validates req.params, req.query, and req.body if schema contains them.
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.validated = req.validated || {};

      if (schema.params) {
        const parsedParams = schema.params.parse(req.params);
        Object.assign(req.params, parsedParams);
        req.validated.params = parsedParams;
      }
      if (schema.query) {
        const parsedQuery = schema.query.parse(req.query);
        // In Express 5 req.query is a getter, so we mutate the object via Object.assign
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, parsedQuery);
        req.validated.query = parsedQuery;
      }
      if (schema.body) {
        const parsedBody = schema.body.parse(req.body);
        req.body = parsedBody;
        req.validated.body = parsedBody;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        return next(new AppError("Validation failed", 422, errors));
      }
      next(err);
    }
  };
}
