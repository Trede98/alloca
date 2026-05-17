import type { CloudPlug, CloudProviderId } from './types';
import { CLOUD_PROVIDER } from './constants';
import { googleDrivePlug } from './providers/google-drive';
import { dropboxPlug } from './providers/dropbox';
import { onedrivePlug } from './providers/onedrive';
import { localFolderPlug } from './providers/local-folder';

export const PLUGS: Record<CloudProviderId, CloudPlug> = {
	[CLOUD_PROVIDER.GOOGLE_DRIVE]: googleDrivePlug,
	[CLOUD_PROVIDER.DROPBOX]: dropboxPlug,
	[CLOUD_PROVIDER.ONEDRIVE]: onedrivePlug,
	[CLOUD_PROVIDER.LOCAL_FOLDER]: localFolderPlug
};
