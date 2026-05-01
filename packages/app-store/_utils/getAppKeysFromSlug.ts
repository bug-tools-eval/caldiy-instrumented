import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

async function getAppKeysFromSlug(slug: string) {
  const app = await prisma.app.findUnique({ where: { slug }, select: { keys: true } });
  return (app?.keys || {}) as Prisma.JsonObject;
}

export default getAppKeysFromSlug;
