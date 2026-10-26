import type { Request, RequestHandler, Response } from 'express';

/** Express 4 doesn't catch errors from async handlers: this wrapper forwards them to the error middleware. */
export function asyncHandler(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}
