import { Request, Response } from 'express';
import { SuppressionsService } from './suppressions.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { CreateSuppressionInput, ListSuppressionsQuery, SuppressionIdParam } from './suppressions.schema.js';

export const createSuppression = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateSuppressionInput;
    const scopedDomainId = req.domain?.id || null;

    const suppression = await SuppressionsService.createSuppression(input, scopedDomainId);

    sendSuccess(
      res,
      suppression,
      `Recipient "${suppression.email}" has been added to suppression list (${suppression.reason})`,
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add suppression';
    sendError(res, message, 400);
  }
};

export const listSuppressions = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query as unknown as ListSuppressionsQuery;
    const scopedDomainId = req.domain?.id || null;

    const result = await SuppressionsService.listSuppressions(query, scopedDomainId);
    sendSuccess(res, result, 'Suppressions retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve suppressions';
    sendError(res, message, 500);
  }
};

export const deleteSuppression = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as SuppressionIdParam;
    const scopedDomainId = req.domain?.id || null;

    const deleted = await SuppressionsService.deleteSuppression(id, scopedDomainId);

    if (!deleted) {
      sendError(res, `Suppression record "${id}" not found`, 404);
      return;
    }

    sendSuccess(
      res,
      deleted,
      `Recipient "${deleted.email}" has been removed from suppressions`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete suppression';
    sendError(res, message, message.includes('Access denied') ? 403 : 500);
  }
};
