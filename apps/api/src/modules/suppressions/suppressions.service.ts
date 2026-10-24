import { prisma } from '../../config/db.js';
import { CreateSuppressionInput, ListSuppressionsQuery } from './suppressions.schema.js';
import { enqueueWebhookDispatch } from '../../queues/webhookDispatch.queue.js';
import { Prisma, Suppression, SuppressionReason } from '@prisma/client';

export class SuppressionsService {
  /**
   * Checks if an email address is suppressed either for the specific domain or globally (domainId = null).
   */
  static async isSuppressed(
    email: string,
    domainId?: string | null
  ): Promise<Suppression | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const where: Prisma.SuppressionWhereInput = {
      email: normalizedEmail,
      OR: [
        { domainId: null }, // Global system-wide suppression
        ...(domainId ? [{ domainId }] : []),
      ],
    };

    return prisma.suppression.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Batch checks a list of recipient email addresses against suppressions.
   * Returns array of matching suppression records.
   */
  static async findSuppressedRecipients(
    emails: string[],
    domainId?: string | null
  ): Promise<Suppression[]> {
    if (!emails.length) return [];

    const normalizedEmails = emails.map((e) => e.toLowerCase().trim());

    return prisma.suppression.findMany({
      where: {
        email: { in: normalizedEmails },
        OR: [
          { domainId: null },
          ...(domainId ? [{ domainId }] : []),
        ],
      },
    });
  }

  /**
   * Adds or updates a suppression record (Domain-scoped or Global).
   * Emits an 'email.suppressed' webhook event.
   */
  static async createSuppression(
    input: CreateSuppressionInput,
    actorDomainId?: string | null
  ) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const targetDomainId = actorDomainId || input.domainId || null;

    if (targetDomainId) {
      const domainExists = await prisma.domain.findUnique({
        where: { id: targetDomainId },
      });
      if (!domainExists) {
        throw new Error(`Domain with ID "${targetDomainId}" does not exist`);
      }
    }

    const existing = await prisma.suppression.findFirst({
      where: {
        domainId: targetDomainId,
        email: normalizedEmail,
      },
    });

    let suppression;
    if (existing) {
      suppression = await prisma.suppression.update({
        where: { id: existing.id },
        data: {
          reason: input.reason as SuppressionReason,
          details: input.details || null,
          updatedAt: new Date(),
        },
        include: {
          domain: {
            select: {
              id: true,
              domainName: true,
            },
          },
        },
      });
    } else {
      suppression = await prisma.suppression.create({
        data: {
          domainId: targetDomainId,
          email: normalizedEmail,
          reason: input.reason as SuppressionReason,
          details: input.details || null,
        },
        include: {
          domain: {
            select: {
              id: true,
              domainName: true,
            },
          },
        },
      });
    }

    // Fire webhook notification for suppression event
    await enqueueWebhookDispatch(
      'email.suppressed',
      {
        email: suppression.email,
        reason: suppression.reason,
        details: suppression.details,
        domainId: suppression.domainId,
        suppressedAt: suppression.createdAt.toISOString(),
      },
      suppression.domainId
    ).catch((err) => {
      console.warn('Failed to enqueue email.suppressed webhook:', err);
    });

    return suppression;
  }

  /**
   * Lists paginated suppressions with search, filter, and domain tenancy boundaries.
   */
  static async listSuppressions(
    query: ListSuppressionsQuery,
    scopedDomainId?: string | null
  ) {
    const where: Prisma.SuppressionWhereInput = {};

    if (scopedDomainId) {
      where.OR = [
        { domainId: scopedDomainId },
        { domainId: null },
      ];
    } else if (query.domainId) {
      where.domainId = query.domainId;
    }

    if (query.reason) {
      where.reason = query.reason as SuppressionReason;
    }

    if (query.search) {
      where.email = { contains: query.search.toLowerCase() };
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [suppressions, total] = await Promise.all([
      prisma.suppression.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          domain: {
            select: {
              id: true,
              domainName: true,
            },
          },
        },
      }),
      prisma.suppression.count({ where }),
    ]);

    return {
      suppressions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Removes an address from the suppression list.
   */
  static async deleteSuppression(id: string, scopedDomainId?: string | null) {
    const existing = await prisma.suppression.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    if (scopedDomainId && existing.domainId && existing.domainId !== scopedDomainId) {
      throw new Error('Access denied: Suppression does not belong to the scoped domain');
    }

    await prisma.suppression.delete({
      where: { id },
    });

    return existing;
  }
}
