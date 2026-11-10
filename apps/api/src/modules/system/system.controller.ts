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

    if (req.query.reset === 'true' || req.query.reset === '1') {
      SystemService.setSimulatedVersion(null);
    }

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

export const triggerSystemUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetVersion } = req.body || {};
    const result = await SystemService.triggerUpdate(targetVersion);

    sendSuccess(res, result, 'Update started in background');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to trigger system update';
    sendError(res, message, 502);
  }
};

export const detectServerPublicIp = async (_req: Request, res: Response): Promise<void> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const data = (await response.json()) as { ip?: string };
      sendSuccess(res, { ip: data.ip || null }, 'Public IP detected');
      return;
    }
  } catch {
    // Graceful offline fallback
  }
  sendSuccess(res, { ip: null }, 'Could not auto-detect public IP');
};
