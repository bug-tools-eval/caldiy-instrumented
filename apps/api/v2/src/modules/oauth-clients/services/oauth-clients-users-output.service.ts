import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import type { ManagedUserOutputFields } from "@/modules/users/users.repository";

@Injectable()
export class OAuthClientUsersOutputService {
  getResponseUser(user: ManagedUserOutputFields) {
    return plainToInstance(ManagedUserOutput, user, { strategy: "excludeAll" });
  }
}
