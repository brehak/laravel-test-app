<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\HasVinylRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreVinylRequest extends FormRequest
{
    use HasVinylRules;

    /**
     * Any authenticated user may create a vinyl in their own collection.
     * There's no existing record to own yet, so there's nothing to authorize
     * beyond being logged in — which the route's auth middleware already
     * guarantees. Return true.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The shared field rules plus the store-only `owned` flag, which lets a
     * record be added straight to the wishlist. It's absent on update because
     * ownership is flipped through the dedicated toggle-owned action instead.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            ...$this->vinylRules(),
            // Optional so records can be added straight to the wishlist; when
            // omitted the record lands in the owned collection (see controller).
            'owned' => ['boolean'],
        ];
    }
}
