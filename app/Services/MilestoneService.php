<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Computes collection "milestones" (achievements) from a user's OWNED records.
 *
 * These are a pure read model — nothing is stored. Given the same set of
 * records the result is always identical, so it's cheap and safe to call on
 * demand from more than one place. It's deliberately decoupled from any single
 * controller so both the owner's own view and (later) the public profile page
 * can render the exact same milestones without duplicating threshold logic.
 *
 * Every aggregate mirrors how the stats page ({@see VinylController::stats()})
 * derives the same fields (genres flattened from the JSON array, decades parsed
 * from the free-text year, condition matched exactly) so the two pages can
 * never disagree about, say, how many decades a shelf spans.
 */
class MilestoneService
{
    /**
     * Compute milestones for a user, scoped strictly to their OWNED records.
     *
     * Wishlist items never count toward achievements. Pulls the collection in a
     * single query and hands off to {@see fromCollection()} for the maths.
     *
     * @return array{totalRecords:int,earnedCount:int,totalCount:int,milestones:list<array>}
     */
    public function for(User $user): array
    {
        return $this->fromCollection(
            $user->vinyls()->where('owned', true)->get()
        );
    }

    /**
     * Same computation as {@see for()} but from an already-loaded collection of
     * owned vinyls, so a caller that has already fetched the records (e.g. a
     * page that also shows stats) can avoid a second query.
     *
     * @param  Collection<int,\App\Models\Vinyl>  $owned
     * @return array{totalRecords:int,earnedCount:int,totalCount:int,milestones:list<array>}
     */
    public function fromCollection(Collection $owned): array
    {
        $total = $owned->count();

        // --- Aggregates the milestones are derived from ---------------------
        // Distinct genres: flatten every record's genre array, then unique.
        $distinctGenres = $owned
            ->flatMap(fn ($vinyl) => $vinyl->genre ?? [])
            ->unique()
            ->count();

        // Distinct *real* decades. The year is free text, so parse the first
        // 4-digit run to a decade and ignore anything that doesn't parse —
        // identical bucketing to the stats page, minus the "Unknown" bucket
        // (an unparseable year isn't a decade you can be credited for).
        $distinctDecades = $owned
            ->map(function ($vinyl) {
                if (! preg_match('/\d{4}/', (string) $vinyl->year, $m)) {
                    return null;
                }

                return intdiv((int) $m[0], 10) * 10;
            })
            ->filter(fn ($decade) => $decade !== null)
            ->unique()
            ->count();

        $mintCount = $owned->filter(fn ($vinyl) => $vinyl->condition === 'Mint')->count();
        $ratedCount = $owned->filter(fn ($vinyl) => $vinyl->rating !== null)->count();
        $notedCount = $owned->filter(fn ($vinyl) => filled($vinyl->notes))->count();

        // --- Milestone definitions ------------------------------------------
        // Each milestone carries its own category + icon so the frontend can
        // group and theme them without hard-coding any of the thresholds.
        $milestones = [];

        // Record-count tiers.
        foreach ([
            10 => ['Getting Started', 'Own 10 records'],
            25 => ['Collector', 'Own 25 records'],
            50 => ['Serious Collector', 'Own 50 records'],
            100 => ['Crate Digger', 'Own 100 records'],
            250 => ['Curator', 'Own 250 records'],
        ] as $threshold => [$label, $description]) {
            $milestones[] = $this->make(
                "records-{$threshold}", 'Collection Size', 'library',
                $label, $description, $total, $threshold,
            );
        }

        // Genre diversity.
        foreach ([
            5 => 'Well Rounded',
            10 => 'Genre Explorer',
            20 => 'Omnivore',
        ] as $threshold => $label) {
            $milestones[] = $this->make(
                "genres-{$threshold}", 'Genre Diversity', 'music',
                $label, "Collect {$threshold} distinct genres", $distinctGenres, $threshold,
            );
        }

        // Decade coverage.
        foreach ([
            3 => 'Time Traveler',
            5 => 'Era Spanner',
            7 => 'Vinyl Historian',
        ] as $threshold => $label) {
            $milestones[] = $this->make(
                "decades-{$threshold}", 'Decade Coverage', 'calendar',
                $label, "Own records from {$threshold} different decades", $distinctDecades, $threshold,
            );
        }

        // Condition — a shelf of pristine pressings.
        $milestones[] = $this->make(
            'mint-10', 'Condition', 'badge-check',
            'Mint Condition', 'Own 10 records in Mint condition', $mintCount, 10,
        );

        // Completionist — rewards diligent cataloguing.
        // "Fully rated" is special: the target IS the collection size, and an
        // empty shelf can't earn it (nothing to rate), so its earned state is
        // computed explicitly rather than by the default progress >= target.
        $milestones[] = $this->make(
            'all-rated', 'Completionist', 'star',
            'Fully Rated', 'Give every record in your collection a rating',
            $ratedCount, max($total, 1),
            earned: $total > 0 && $ratedCount === $total,
        );
        $milestones[] = $this->make(
            'notes-25', 'Completionist', 'notebook-pen',
            'Liner Notes', 'Write notes on 25 records', $notedCount, 25,
        );

        $earnedCount = count(array_filter($milestones, fn ($m) => $m['earned']));

        return [
            'totalRecords' => $total,
            'earnedCount' => $earnedCount,
            'totalCount' => count($milestones),
            'milestones' => $milestones,
        ];
    }

    /**
     * Build one milestone row.
     *
     * `progress` is clamped to `target` so an over-achieved milestone (own 300
     * records against a 250 tier) still reports a clean "250/250" rather than
     * spilling past 100%. By default a milestone is earned once progress meets
     * the target; pass `$earned` to override for milestones whose earned state
     * doesn't follow from a simple threshold.
     *
     * @return array{id:string,category:string,icon:string,label:string,description:string,progress:int,target:int,earned:bool}
     */
    private function make(
        string $id,
        string $category,
        string $icon,
        string $label,
        string $description,
        int $progress,
        int $target,
        ?bool $earned = null,
    ): array {
        return [
            'id' => $id,
            'category' => $category,
            'icon' => $icon,
            'label' => $label,
            'description' => $description,
            'progress' => min($progress, $target),
            'target' => $target,
            'earned' => $earned ?? $progress >= $target,
        ];
    }
}
