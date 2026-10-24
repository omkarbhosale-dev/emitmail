import { Request, Response } from 'express';
import { ServerConfigService } from './serverConfig.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { UpdateServerConfigInput } from './serverConfig.schema.js';

export const getServerConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await ServerConfigService.getServerConfigWithChecklist();
    sendSuccess(res, data, 'Master server configuration retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve server configuration';
    sendError(res, message, 500);
  }
};

export const updateServerConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as UpdateServerConfigInput;
    const data = await ServerConfigService.updateServerConfig(input);
    sendSuccess(
      res,
      data,
      'Server configuration updated successfully. Pending domain records refreshed.'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update server configuration';
    sendError(res, message, 500);
  }
};
