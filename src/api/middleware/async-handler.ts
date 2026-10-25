import type { Request, RequestHandler, Response } from 'express';

/** Express 4 no captura los errores de handlers async: este envoltorio los manda al middleware de errores. */
export function asyncHandler(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}
