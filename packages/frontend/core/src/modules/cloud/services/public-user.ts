import {
  effect,
  fromPromise,
  LiveData,
  Service,
  smartRetry,
} from '@toeverything/infra';
import { catchError, EMPTY, exhaustMap, groupBy, mergeMap } from 'rxjs';

import type { PublicUserStore } from '../stores/public-user';

type RemovedUserInfo = {
  id: string;
  removed: true;
};

type ExistedUserInfo = {
  id: string;
  name?: string | null;
  avatar?: string | null;
  removed?: false;
};

export type PublicUserInfo = RemovedUserInfo | ExistedUserInfo;

export class PublicUserService extends Service {
  constructor(private readonly store: PublicUserStore) {
    super();
  }

  publicUsers$ = new LiveData<Map<string, PublicUserInfo | null>>(new Map());

  publicUser$(id: string) {
    return this.publicUsers$.selector(map => map.get(id) ?? null);
  }

  error$ = new LiveData<any | null>(null);

  revalidate = effect(
    groupBy((id: string) => id),
    mergeMap(id$ =>
      id$.pipe(
        exhaustMap(id =>
          fromPromise(async signal => {
            const user = await this.store.getPublicUserById(id, signal);
            if (!user) {
              return {
                id,
                removed: true,
              };
            }
            return {
              id,
              name: user.name,
              avatarUrl: user.avatarUrl,
            };
          }).pipe(
            smartRetry(),
            catchError(error => {
              console.error(error);
              this.error$.next(error);
              return EMPTY;
            }),
            mergeMap(user => {
              const publicUsers = new Map(this.publicUsers$.value);
              publicUsers.set(user.id, user);
              this.publicUsers$.next(publicUsers);
              return EMPTY;
            })
          )
        )
      )
    )
  );
}
