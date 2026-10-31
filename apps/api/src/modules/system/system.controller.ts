import { Request, Response } from 'express';
import { SystemService } from './system.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export const getSystemVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const refresh =
      req.query.refresh === 'true' ||
      req.query.refresh === '1' ||
      req.query.force === 'true' ||
      req.query.force === '1';

    const updateInfo = await SystemService.checkSystemUpdate(refresh);

    sendSuccess(
      res,
      updateInfo,
      'System version and update information retrieved successfully'
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve system update information';
    sendError(res, message, 500);
  }
};
