import type { MemberSearchService } from '@affine/core/modules/permissions';
import { UserListServiceExtension } from '@blocksuite/affine/blocks';

export function patchUserListExtensions(memberSearch: MemberSearchService) {
  return UserListServiceExtension({
    // eslint-disable-next-line rxjs/finnish
    hasMore$: memberSearch.hasMore$.signal,
    loadMore() {
      memberSearch.loadMore();
    },
    search(keyword) {
      memberSearch.search(keyword);
    },
    // eslint-disable-next-line rxjs/finnish
    users$: memberSearch.result$.map(users =>
      users.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatarUrl,
      }))
    ).signal,
  });
}
