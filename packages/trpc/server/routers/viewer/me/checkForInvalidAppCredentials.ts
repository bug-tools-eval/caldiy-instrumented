import { getAppFromSlug } from "@calcom/app-store/utils";
import type { InvalidAppCredentialBannerProps } from "@calcom/features/users/types/invalidAppCredentials";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

class PermissionCheckService {
  constructor(_prisma?: unknown) {}
  async checkPermission(..._args: unknown[]) {
    return true;
  }
  async hasPermission(..._args: unknown[]) {
    return true;
  }
  async getTeamIdsWithPermission(..._args: unknown[]): Promise<number[]> {
    return [];
  }
}

type checkInvalidAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const checkInvalidAppCredentials = async ({ ctx }: checkInvalidAppCredentialsOptions) => {
  const userId = ctx.user.id;

  const permissionCheckService = new PermissionCheckService();
  const userTeamIds = await permissionCheckService.getTeamIdsWithPermission({
    userId,
    permission: "team.update",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  const apps = await prisma.credential.findMany({
    distinct: ["appId"],
    where: {
      OR: [{ userId }, { teamId: { in: userTeamIds } }],
      invalid: true,
    },
    select: {
      appId: true,
    },
  });

  const appIds = apps.flatMap((app) => (app.appId ? [app.appId] : []));

  return Promise.all(
    appIds.map(async (appId): Promise<InvalidAppCredentialBannerProps> => {
      const appMeta = await getAppFromSlug(appId);
      const name = appMeta ? appMeta.name : appId;
      return { slug: appId, name };
    })
  );
};
