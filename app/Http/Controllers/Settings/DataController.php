<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Vinyl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DataController extends Controller
{
    /**
     * The columns exported, in order. This is the authoritative shape of both
     * the CSV header row and each JSON object — keeping the two formats in
     * lockstep so an export can never drift between them.
     *
     * @var list<string>
     */
    private const COLUMNS = ['title', 'artist', 'year', 'genre', 'condition', 'color', 'rating', 'notes', 'owned'];

    /**
     * Download the authenticated user's ENTIRE collection (owned + wishlist) as
     * CSV or JSON. Scoped strictly to $request->user()->vinyls() — a user can
     * only ever export their own records.
     */
    public function export(Request $request): StreamedResponse|JsonResponse
    {
        $format = $request->query('format', 'csv');
        abort_unless(in_array($format, ['csv', 'json'], true), 404);

        $vinyls = $request->user()->vinyls()->latest()->get();

        return $format === 'json'
            ? $this->json($vinyls)
            : $this->csv($vinyls);
    }

    /**
     * Reduce a record to the public export shape (see {@see COLUMNS}). `genre`
     * is a JSON array on the model; it's joined with a pipe for the flat CSV and
     * kept as an array for JSON.
     *
     * @return array<string, mixed>
     */
    private function row(Vinyl $vinyl, bool $flattenGenre): array
    {
        return [
            'title' => $vinyl->title,
            'artist' => $vinyl->artist,
            'year' => $vinyl->year,
            'genre' => $flattenGenre ? implode('|', $vinyl->genre ?? []) : ($vinyl->genre ?? []),
            'condition' => $vinyl->condition,
            'color' => $vinyl->color,
            'rating' => $vinyl->rating,
            'notes' => $vinyl->notes,
            'owned' => $vinyl->owned,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Vinyl>  $vinyls
     */
    private function json($vinyls): JsonResponse
    {
        $data = $vinyls->map(fn (Vinyl $v) => $this->row($v, flattenGenre: false))->values();

        return response()->json($data)
            ->withHeaders(['Content-Disposition' => 'attachment; filename="spinlist-collection.json"']);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Vinyl>  $vinyls
     */
    private function csv($vinyls): StreamedResponse
    {
        return response()->streamDownload(function () use ($vinyls) {
            $out = fopen('php://output', 'w');
            fputcsv($out, self::COLUMNS);
            foreach ($vinyls as $vinyl) {
                fputcsv($out, array_values($this->row($vinyl, flattenGenre: true)));
            }
            fclose($out);
        }, 'spinlist-collection.csv', ['Content-Type' => 'text/csv']);
    }
}
