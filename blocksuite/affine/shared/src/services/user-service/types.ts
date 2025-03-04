export type RemovedUserInfo = {
  id: string;
  removed: true;
};

export type ExistedUserInfo = {
  id: string;
  name: string;
  avatar: string;
  removed?: false;
};

export type AffineUserInfo = RemovedUserInfo | ExistedUserInfo;

export function isRemovedUserInfo(
  userInfo: AffineUserInfo
): userInfo is RemovedUserInfo {
  return Boolean('removed' in userInfo && userInfo.removed);
}

export function isExistedUserInfo(
  userInfo: AffineUserInfo
): userInfo is ExistedUserInfo {
  return !isRemovedUserInfo(userInfo);
}
