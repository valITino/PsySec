/**
 * URLs der Latin-Dateien beider Schriften für den Preload im <head>.
 * Beide werden vorgeladen: Kommt eine Schrift erst nach dem ersten Bild an, rechnet der Browser
 * das Layout der ganzen Seite ein zweites Mal.
 */
import monoLatinUrl from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url';
import sansLatinUrl from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url';

export { monoLatinUrl, sansLatinUrl };
