import first from './project-01.assets.json';
import second from './project-02.assets.json';
import firstCover from './project-01-cover.assets.json';
import secondCover from './project-02-cover.assets.json';
export const projectAssets = { 'project-01': first, 'project-02': second, 'project-01-cover':firstCover, 'project-02-cover':secondCover };
export type VisualAssets = Pick<typeof second, 'projectId' | 'palette' | 'poster' | 'mobile' | 'texture' | 'spatial'>;
export function assetsFor(id: string): VisualAssets {
  const assets = projectAssets[id as keyof typeof projectAssets];
  if (!assets) throw new Error(`Missing project assets: ${id}`);
  return assets;
}
