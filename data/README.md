# Filling in `dishes.csv`

One row per dish. This file is the **only** source for the menu — nothing is guessed. Any cell left empty or set to `TO_CONFIRM` shows diners **"Please confirm with your server"**.

| Column | What to write | Example |
|---|---|---|
| `id` | short name, lowercase, dashes (never change it once printed) | `steak-main` |
| `name` | dish name as on the menu | `Premium Ribeye Steak` |
| `category` | menu section; sections appear in the order they first appear here | `Signature Cuts` |
| `price_pkr` | whole rupees, no "Rs" | `3495` |
| `description` | one or two sentences | |
| `is_3d` | `yes` if there is a 3D scan, else `no` | `yes` |
| `plate_shape` | `round` or `rect` | `rect` |
| `plate_length_cm` / `plate_width_cm` | measured plate size — used to size the dish in AR | `42` |
| `ingredients` | separated by `;` | `ribeye; potato; butter` |
| `allergens` | separated by `;`, only from: gluten, dairy, egg, tree nuts, peanuts, soy, sesame, fish, shellfish, mustard, sulphites. Write `none` if there are none. | `dairy; gluten` |
| `halal` | `yes` or `no` | `yes` |
| `spice_level` | `0` not spicy, `1` mild, `2` medium, `3` hot | `1` |
| `dietary` | separated by `;`, or `none` | `gluten-free` |
| `calories`, `protein_g`, `fat_g`, `carbs_g`, `serving_g` | numbers only, from the kitchen | `620` |
| `confirmed_by` | who checked this row, and when | `Abdullah 2026-10-01` |

After editing, run `npm run build` — it stops with a clear message if anything is wrong (e.g. an unknown allergen).

Note: `spice_level` of `0` is only shown as "not spicy" once `confirmed_by` is filled in, because `0` was the template's default.
