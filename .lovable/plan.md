

## Problems Identified

### 1. AI ingredient matching is broken
In `RecipeForm.tsx` `handleParse`, after the AI returns parsed ingredients, the code tries to match them against `allIngredients` (the user's `ingredients` table) using a simple `String.includes()` check. For new users this table is empty, so nothing matches. Even for existing users, the substring match is unreliable and doesn't search the official TACO/IBGE composition database.

### 2. "Trocar" button doesn't work
In `IngredientSearch.tsx`, the "trocar" button (line 294) calls `setQuery(''); handleInputChange('')`. This sets query to `''`, but the render condition on line 286 (`selectedName && !showResults && !query`) evaluates true again immediately, so the component snaps back to showing the selected name instead of the search input.

---

## Plan

### Fix 1: "Trocar" button
Add a local state `isEditing` to `IngredientSearch`. When "trocar" is clicked, set `isEditing = true`. Change the render condition to also check `!isEditing`. Reset `isEditing` when an ingredient is selected.

### Fix 2: AI ingredient auto-matching via composition DB
After the AI parses the recipe, instead of doing a naive substring match against the user's `ingredients` table, use the `search_food_composition` RPC for each parsed ingredient to find the best match from the TACO/IBGE database. Then automatically create derived ingredients (same flow as `selectFromComposition` in `IngredientSearch`) so each item has a valid `ingredient_id`. Items that can't be matched will be flagged with a warning so the user can manually search/assign them.

**Changes to `RecipeForm.tsx` `handleParse`:**
- For each AI-parsed item, call `supabase.rpc('search_food_composition', { search_term: item.name, max_results: 1 })`
- If a match is found with reasonable similarity, auto-create an ingredient from the composition data (insert into `ingredients` table)
- Set the `ingredient_id` and `ingredient_name` from the created ingredient
- If no match, leave `ingredient_id` empty and show the AI-suggested name with a warning so the user can manually search

This will run all searches in parallel for performance.

### Files to change
1. `src/components/IngredientSearch.tsx` — add `isEditing` state to fix trocar button
2. `src/pages/RecipeForm.tsx` — rewrite `handleParse` ingredient matching logic to use composition DB RPC

