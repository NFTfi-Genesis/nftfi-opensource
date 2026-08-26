# Displaying & Formatting Token Amounts (Default Half-Up Rounding + Minimum Precision Rule)

> Last updated: 2025/03/26

# DEFAULT RULES

1. **Stablecoins (USDC, DAI)**
   - **Never show decimals, round half‐up**, for any nonzero amount.
   - If the amount is truly zero, display `0`.
   - If rounding yields `0` for a nonzero amount, display `"<1"`.
2. **ETH, wETH**
   - Start with **3 decimals**, **round half‐up** for amounts **≥ 0.001**.
   - If the rounded result to 3 decimals would display `0.000` (but it’s actually nonzero), display `"<0.001"`.
3. **Big Number Notation**
   - If the number (before or after rounding) is large enough to exceed the available UI space, switch to short notation (`k`/`m`).
   - **k** = thousands, **m** = millions.
   - For millions, **round half‐up** at **2 decimals** once converted to “millions.”
     - Example: `1.234567m → 1.23m`.
4. **Minimum Precision Rule**
   - **Never show decimal digits for stablecoins** if the value is nonzero (or `0` if it’s truly zero).
   - **Always show three decimal digits for wETH, ETH** if the value is nonzero.
   - If the “default” decimals and rounding would yield `0` (for stablecoins) or `0.000` (for ETH/wETH), display `<1` (for USDC/DAI) or `<0.001` (for ETH/wETH).
   - These measures ensure that users never see `0` for a small but nonzero values.
5. **Tooltip Precision**
   - Up to **6 decimals** (rounded half‐up) for crypto tokens (ETH, wETH).
   - Up to **4 decimals** (rounded half‐up) for stablecoins (USDC, DAI).
   - (Still observe the minimum‐precision rule when the on‐screen display might otherwise show zero.)

---

## EXAMPLES

### Stablecoins (USDC, DAI)

| **Input**                | **On-Screen** | **Explanation**                                              | **Tooltip**                     |
| ------------------------ | ------------- | ------------------------------------------------------------ | ------------------------------- |
| `0`                      | `0`           | Exactly zero → `0`.                                          | `0`                             |
| `0.0005`                 | `<1`          | 2‐decimal rounding → `0` for a nonzero amount → show `"<1"`. | `0.0005`                        |
| `0.00049`                | `<1`          | Would round to `0` → `"<1"`.                                 | `0.0005` (4th dec. rounds up)   |
| `0.0004999`              | `<1`          | Same logic → `"<1"`.                                         | `0.0005` (4th dec. rounds up)   |
| `0.0001234`              | `<1`          | Would be `0` → `"<1"`.                                       | `0.0001` (no further round)     |
| `1`                      | `1`           | Whole number.                                                | `1`                             |
| `1.2345`                 | `1`           | 3rd decimal is 4 → no round‐up.                              | `1.2345`                        |
| `1.9999`                 | `2`           | 3rd decimal is 9 → round second decimal up → `2`.            | `1.9999`                        |
| `12,345.6789`            | `12,346`      | 3rd decimal is 8 → round up → `12,346`.                      | `12,345.6789`                   |
| `100,000`                | `100,000`     | Large integer.                                               | `100,000`                       |
| `100,000` (Short)        | `100k`        | Short notation for large value.                              | `100,000`                       |
| `100,000.9999`           | `100,001`     | Rounds up.                                                   | `100,000.9999`                  |
| `100,000.9999` (Short)   | `100k`        | After rounding to `100,001` → short notation → `100k`.       | `100,000.9999`                  |
| `999,999.9999`           | `1,000,000`   | Rounds up.                                                   | `999,999.9999`                  |
| `1,000,000`              | `1,000,000`   | Exactly one million.                                         | `1,000,000`                     |
| `1,000,000` (Short)      | `1m`          | Short notation.                                              | `1,000,000`                     |
| `1,234,567.9999`         | `1,234,568`   | Rounds up.                                                   | `1,234,567.9999`                |
| `1,234,567.9999` (Short) | `1.23m`       | `1,234,568` → `1.234568m` → 3rd decimal is 4 → `1.23m`.      | `1,234,567.9999`                |
| `0.0000004`              | `<1`          | Very small nonzero → `0` → `"<1"`.                           | `<0.0001` (still 0 at 4 dec.)   |
| `0.0000065`              | `<1`          | `0` → `"<1"`; at 4 decimals still `0.0000` → `"<0.0001"`.    | `<0.0001`                       |
| `0.1234567`              | `<1`          | 3rd decimal is 3 → no round up → `<1`.                       | `0.1235` (4th dec. = 5 → round) |

---

### ETH, wETH

Start with 3 decimals (round half‐up). If 3 decimals yield `0.000` for a nonzero value, display `<0.001`. Tooltip can show up to 6 decimals.

| **Input**                | **On-Screen**   | **Explanation**                                                                      | **Tooltip**                |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| `0`                      | `0.000`         | Exactly zero → `0.000`.                                                              | `0.000`                    |
| `0.0005`                 | `0.001`         | 4th decimal is 5 → round up the 3rd decimal.                                         | `0.0005`                   |
| `0.00049`                | `<0.001`        | 4th decimal is 4 → on‐screen rounds to `0.000` → display `"<0.001"`.                 | `0.00049`                  |
| `0.0004999`              | `<0.001`        | 4th decimal is 4 → still `0.000` → `"<0.001"`.                                       | `0.0005` (6‐decimal round) |
| `0.0001234`              | `<0.001`        | 4th decimal is 1 → on‐screen `0.000` → `"<0.001"`.                                   | `0.000123`                 |
| `1`                      | `1.000`         | Whole number, always 3 decimals.                                                     | `1.000`                    |
| `1.2345`                 | `1.235`         | 4th decimal is 5 → round the 3rd decimal up.                                         | `1.2345`                   |
| `1.9999`                 | `2.000`         | Rounds up at 3 decimals.                                                             | `1.9999`                   |
| `12,345.6789`            | `12,345.679`    | 4th decimal is 9 → round up at 3 decimals.                                           | `12,345.6789`              |
| `100,000`                | `100,000.000`   | Large integer with 3 decimals.                                                       | `100,000.000`              |
| `100,000` (Short)        | `100k`          | After rounding → short notation.                                                     | `100,000.000`              |
| `100,000.9999`           | `100,001.000`   | Rounds up at 3 decimals.                                                             | `100,000.9999`             |
| `100,000.9999` (Short)   | `100k`          | `100,001` → short notation → `100k`.                                                 | `100,000.9999`             |
| `999,999.9999`           | `1,000,000.000` | Rounds up.                                                                           | `999,999.9999`             |
| `1,000,000`              | `1,000,000.000` | Exactly one million.                                                                 | `1,000,000.000`            |
| `1,000,000` (Short)      | `1m`            | Short notation for large value.                                                      | `1,000,000.000`            |
| `1,234,567.9999`         | `1,234,568.000` | Rounds up at 3 decimals.                                                             | `1,234,567.9999`           |
| `1,234,567.9999` (Short) | `1.23m`         | `1,234,568` → `1.234568m` → 3rd decimal is 4 → `1.23m`.                              | `1,234,567.9999`           |
| `0.0000004`              | `<0.001`        | Very small → would be `0.000` on‐screen → `"<0.001"`.                                | `"<0.000001"` (6 dec. → 0) |
| `0.0000065`              | `<0.001`        | 3 decimals → `0.000` → `"<0.001"`; at 6 decimals → `0.000007`.                       | `0.000007`                 |
| `0.1234567`              | `0.123`         | 4th decimal is 4 → no round up at 3 decimals. Tooltip up to 6 decimals → `0.123457`. | `0.123457`                 |

## TOOLTIP

Show this tooltip on mouseover or on tap (for mobile).

1. **Stablecoins (USDC, DAI)**
   - **Default**: Show up to **4 decimals**, rounded half-up.
   - **If that yields zero** (i.e., `0` for a nonzero amount):
     1. If even at 4 decimals it still rounds to `0.0000`, display `"<0.0001"`.
2. **ETH, wETH**
   - **Default**: Show up to **6 decimals**, rounded half-up.
   - **If that yields zero** (i.e., `0.000000` for a nonzero amount):
     1. If even at 6 decimals it still rounds to `0.000000`, display `"<0.000001"`.
3. **No Big Number notation** in tooltips (always the full numeric result, up to the maximum decimals above).

---
