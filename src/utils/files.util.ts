import path from 'path';

import FilesMiddleware from '../middleware/items/files.middleware';

import { Post, Event, LoyaltyOffer, MicrocreditCampaign } from '../_interfaces/index';

/**
 * Helper's Instance
 */
const existFile = FilesMiddleware.existsFile;
const deleteFile = FilesMiddleware.deleteFile;
const deleteSync = FilesMiddleware.deleteSync;

class FilesUtil {
    /** Remove File (Local Function) */
    public async removeFile(currentItem: Post | Event | LoyaltyOffer | MicrocreditCampaign) {
        var imageFile = (currentItem['imageURL']).split('assets/static/');
        const file = path.join(__dirname, '../assets/static/' + imageFile[1]);
        if (existFile(file)) await deleteFile(file);
    }

    /** Remove Content Files (Local Function) */
    public async removeRichEditorFiles(currentItem: Post | Event | MicrocreditCampaign, contentFiles: string[], isUpdated: boolean) {
        var toDelete: string[] = [];

        if (isUpdated) {
            (contentFiles).forEach((element: string) => {
                if ((contentFiles).indexOf(element) < 0) {
                    var imageFile = (element).split('assets/content/');
                    const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
                    toDelete.push(file);
                }
            });
            toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
        } else {
            (currentItem.contentFiles).forEach((element: string) => {
                var imageFile = (element).split('assets/content/');
                const file = path.join(__dirname, '../assets/content/' + imageFile[1]);
                toDelete.push(file);
            });
            toDelete.forEach(path => { if (existFile(path)) deleteSync(path) })
        }
    }

}

export default FilesUtil;