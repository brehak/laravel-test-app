/**
 * iTunes Search API integration.
 *
 * The public iTunes Search API needs no key and no backend proxy, so these are
 * plain browser `fetch` calls. Docs: https://performance-partners.apple.com/search-api
 *
 * All network-facing functions swallow errors and return an empty array so the
 * UI can degrade gracefully instead of throwing.
 */

// ----- Return shapes -----------------------------------------------------

/** A music artist result from the /search endpoint. */
export interface ItunesArtist {
    artistId: number;
    artistName: string;
}

/** An album result derived from the /lookup endpoint. */
export interface ItunesAlbum {
    collectionId: number;
    collectionName: string;
    artistName: string;
    artworkUrl100: string;
    releaseDate: string;
}

/**
 * The shape the Add Vinyl form will consume once the user picks an album.
 * Kept separate from `ItunesAlbum` so the form can carry a UI-friendly,
 * already-resolved artwork URL alongside the raw fields it maps to the model.
 */
export interface SelectedAlbum {
    collectionId: number;
    title: string;
    artist: string;
    artworkUrl: string;
    releaseDate: string;
}

// ----- Raw API payloads (internal) --------------------------------------

/** Envelope returned by every iTunes Search/Lookup endpoint. */
interface ItunesResponse<T> {
    resultCount: number;
    results: T[];
}

/** Loosely-typed raw result row; iTunes mixes artist and collection rows. */
interface ItunesRawResult {
    wrapperType?: string;
    collectionType?: string;
    artistId?: number;
    artistName?: string;
    collectionId?: number;
    collectionName?: string;
    artworkUrl100?: string;
    releaseDate?: string;
    trackCount?: number;
}

// ----- Public functions -------------------------------------------------

/**
 * Search for music artists by name.
 * Returns an empty array on any network/parse error.
 */
export async function searchArtists(term: string, limit = 10): Promise<ItunesArtist[]> {
    try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=musicArtist&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) return [];

        const data: ItunesResponse<ItunesRawResult> = await response.json();

        return data.results
            .filter((r): r is ItunesRawResult & { artistId: number; artistName: string } =>
                typeof r.artistId === 'number' && typeof r.artistName === 'string',
            )
            .map((r) => ({ artistId: r.artistId, artistName: r.artistName }));
    } catch {
        return [];
    }
}

/**
 * Look up an artist's albums.
 * Returns an empty array on any network/parse error.
 */
export async function fetchAlbumsByArtist(artistId: number): Promise<ItunesAlbum[]> {
    try {
        const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=album`;
        const response = await fetch(url);
        if (!response.ok) return [];

        const data: ItunesResponse<ItunesRawResult> = await response.json();

        // The first result is the artist record itself; the remaining rows are
        // the artist's releases. Keep only real albums — iTunes tags these with
        // collectionType === 'Album', and every collection row has
        // wrapperType === 'collection' (guards against singles/compilations
        // that omit collectionType).
        return data.results
            .filter((r) => r.collectionType === 'Album' || r.wrapperType === 'collection')
            .filter((r): r is ItunesRawResult & ItunesAlbum =>
                typeof r.collectionId === 'number' && typeof r.collectionName === 'string',
            )
            // Drop singles and EPs: iTunes suffixes their titles with "- Single"
            // or "- EP", and they carry very few tracks. Excluded if either
            // signal is present.
            .filter((r) => {
                const name = r.collectionName.toLowerCase();
                if (name.includes('- single') || name.includes('- ep')) return false;
                if (typeof r.trackCount === 'number' && r.trackCount < 3) return false;
                return true;
            })
            .map((r) => ({
                collectionId: r.collectionId,
                collectionName: r.collectionName,
                artistName: r.artistName ?? '',
                artworkUrl100: r.artworkUrl100 ?? '',
                releaseDate: r.releaseDate ?? '',
            }))
            .sort((a, b) => a.collectionName.localeCompare(b.collectionName));
    } catch {
        return [];
    }
}

/**
 * Upgrade an iTunes artwork URL to a higher resolution.
 *
 * iTunes hands back 100×100 thumbnails whose filenames embed the dimensions,
 * e.g. `.../source/100x100bb.jpg`. Swapping the `100x100bb.` token for
 * `<size>x<size>bb.` requests a larger render from the same CDN. If the token
 * isn't present (unexpected URL shape), the original URL is returned unchanged.
 */
export function getHighResArtwork(artworkUrl: string, size = 600): string {
    const token = '100x100bb.';
    if (!artworkUrl.includes(token)) return artworkUrl;
    return artworkUrl.replace(token, `${size}x${size}bb.`);
}
