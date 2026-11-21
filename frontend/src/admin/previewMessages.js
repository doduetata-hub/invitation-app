// Types de messages échangés entre l'éditeur d'invitation (page parente) et la page d'aperçu chargée dans son iframe (PreviewFramePage).
// Fichier séparé et minuscule : l'éditeur n'a pas à embarquer le moteur de templates pour connaître ces deux noms.
export const PREVIEW_MESSAGE = 'jhr-preview'; // parent -> iframe : { type, invitation }
export const PREVIEW_READY = 'jhr-preview-ready'; // iframe -> parent : la page est prête à recevoir l'invitation
