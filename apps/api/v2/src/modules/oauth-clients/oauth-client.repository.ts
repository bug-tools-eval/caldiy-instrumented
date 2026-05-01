import type { PlatformOAuthClient, Prisma } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

const oauthClientBookingSelect = {
  id: true,
  bookingCancelRedirectUri: true,
  bookingRescheduleRedirectUri: true,
  bookingRedirectUri: true,
  areEmailsEnabled: true,
  areCalendarEventsEnabled: true,
} satisfies Prisma.PlatformOAuthClientSelect;

export type OAuthClientBookingFields = Prisma.PlatformOAuthClientGetPayload<{
  select: typeof oauthClientBookingSelect;
}>;

const oauthClientManagedUserSelect = {
  id: true,
  organizationId: true,
  areDefaultEventTypesEnabled: true,
} satisfies Prisma.PlatformOAuthClientSelect;

export type OAuthClientManagedUserFields = Prisma.PlatformOAuthClientGetPayload<{
  select: typeof oauthClientManagedUserSelect;
}>;

@Injectable()
export class OAuthClientRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async createOAuthClient(
    organizationId: number,
    data: Omit<Prisma.PlatformOAuthClientCreateInput, "organization">
  ) {
    return this.dbWrite.prisma.platformOAuthClient.create({
      data: {
        ...data,
        organizationId,
      },
    });
  }

  async getOAuthClient(clientId: string): Promise<PlatformOAuthClient | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
    });
  }

  async getOAuthClientProviderFields(
    clientId: string
  ): Promise<Pick<PlatformOAuthClient, "id" | "organizationId" | "name"> | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        organizationId: true,
        name: true,
      },
    });
  }

  async getOAuthClientBookingFields(clientId: string): Promise<OAuthClientBookingFields | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: oauthClientBookingSelect,
    });
  }

  async getOAuthClientRedirectUrisById(
    clientId: string
  ): Promise<Pick<PlatformOAuthClient, "redirectUris"> | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: {
        redirectUris: true,
      },
    });
  }

  async getOAuthClientAuthFieldsById(
    clientId: string
  ): Promise<Pick<PlatformOAuthClient, "secret" | "organizationId"> | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: {
        secret: true,
        organizationId: true,
      },
    });
  }

  async getOAuthClientManagedUserFields(clientId: string): Promise<OAuthClientManagedUserFields | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: oauthClientManagedUserSelect,
    });
  }

  async getOAuthClientPermissionsById(
    clientId: string
  ): Promise<Pick<PlatformOAuthClient, "id" | "permissions"> | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        permissions: true,
      },
    });
  }

  async getOAuthClientOrganizationById(
    clientId: string
  ): Promise<Pick<PlatformOAuthClient, "id" | "organizationId"> | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        organizationId: true,
      },
    });
  }

  async getOAuthClientWithAuthTokens(tokenId: string, clientId: string, clientSecret: string) {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: {
        id: clientId,
        secret: clientSecret,
        authorizationTokens: {
          some: {
            id: tokenId,
          },
        },
      },
      select: {
        authorizationTokens: {
          where: {
            id: tokenId,
          },
          take: 1,
          select: {
            id: true,
            owner: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  }

  async getOAuthClientWithRefreshSecret(clientId: string, clientSecret: string, refreshToken: string) {
    return this.dbRead.prisma.platformOAuthClient.findFirst({
      where: {
        id: clientId,
        secret: clientSecret,
      },
      select: {
        refreshToken: {
          where: {
            secret: refreshToken,
          },
          take: 1,
          select: {
            secret: true,
            userId: true,
          },
        },
      },
    });
  }

  async getOrganizationOAuthClients(organizationId: number): Promise<PlatformOAuthClient[]> {
    return this.dbRead.prisma.platformOAuthClient.findMany({
      where: {
        organization: {
          id: organizationId,
        },
      },
    });
  }

  async updateOAuthClient(
    clientId: string,
    updateData: Prisma.PlatformOAuthClientUpdateInput
  ): Promise<PlatformOAuthClient> {
    return this.dbWrite.prisma.platformOAuthClient.update({
      where: { id: clientId },
      data: updateData,
    });
  }

  async deleteOAuthClient(clientId: string): Promise<PlatformOAuthClient> {
    return this.dbWrite.prisma.platformOAuthClient.delete({
      where: { id: clientId },
    });
  }

  async getByUserId(userId: number) {
    return this.dbRead.prisma.platformOAuthClient.findFirst({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
      select: oauthClientBookingSelect,
    });
  }

  async getByTeamId(teamId: number) {
    return this.dbRead.prisma.platformOAuthClient.findFirst({
      where: {
        teams: {
          some: {
            id: teamId,
          },
        },
      },
      select: oauthClientBookingSelect,
    });
  }

  async getByOrgId(organizationId: number) {
    return this.dbRead.prisma.platformOAuthClient.findMany({
      where: {
        organizationId,
      },
      select: { id: true },
    });
  }

  async getByEventTypeHosts(eventTypeId: number) {
    const hostWithUserPlatformClient = await this.dbRead.prisma.host.findFirst({
      select: {
        user: {
          select: {
            platformOAuthClients: {
              take: 1,
              select: oauthClientBookingSelect,
            },
          },
        },
      },
      where: {
        eventTypeId: eventTypeId,
        user: {
          isPlatformManaged: true,
        },
      },
    });
    return hostWithUserPlatformClient?.user?.platformOAuthClients?.[0] ?? null;
  }
}
