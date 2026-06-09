export type CreatorType =
  | 'editor'
  | 'videographer'
  | 'photographer'
  | 'ugc'
  | 'blogger'
  | 'model'
  | 'telegram_channel';

export function getDashboardPathForCreatorType(
  creatorType: string | null | undefined
): string {
  if (creatorType === 'editor') return '/editor-dashboard';
  if (creatorType === 'telegram_channel') return '/telegram-dashboard';
  return '/production-dashboard';
}

export function isAllowedOn(
  route: '/editor-dashboard' | '/production-dashboard' | '/creator-dashboard' | '/telegram-dashboard',
  creatorType: string | null | undefined
): boolean {
  return getDashboardPathForCreatorType(creatorType) === route;
}
