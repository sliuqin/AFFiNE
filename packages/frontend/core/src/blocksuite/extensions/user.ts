import type {
  AuthService,
  PublicUserService,
} from '@affine/core/modules/cloud';
import { UserServiceExtension } from '@blocksuite/affine/blocks';

export function patchUserExtensions(
  publicUserService: PublicUserService,
  authService: AuthService
) {
  return UserServiceExtension({
    getCurrentUser() {
      const account = authService.session.account$.value;
      return account
        ? {
            id: account.id,
            avatar: account.avatar,
            name: account.label,
          }
        : null;
    },
    // eslint-disable-next-line rxjs/finnish
    userInfo$(id) {
      return publicUserService.publicUser$(id).signal;
    },
    revalidateUserInfo(id) {
      publicUserService.revalidate(id);
    },
  });
}
