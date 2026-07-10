<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\HasVinylRules;
use App\Models\Vinyl;
use Illuminate\Foundation\Http\FormRequest;

class UpdateVinylRequest extends FormRequest
{
    use HasVinylRules;

    /**
     * An update targets a specific {vinyl}, so authorization is ownership:
     * the record must belong to the authenticated user. Returning false here
     * yields a 403 before validation runs — the same outcome as the previous
     * abort_if() guard in the controller, just moved to where the request is
     * bound to a resource.
     */
    public function authorize(): bool
    {
        $vinyl = $this->route('vinyl');

        return $vinyl instanceof Vinyl
            && $vinyl->user_id === $this->user()?->id;
    }

    /**
     * The shared field rules. Update validates exactly the same user-editable
     * fields as store (the `owned` flag is store-only).
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return $this->vinylRules();
    }
}
