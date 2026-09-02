// SPDX-License-Identifier: BSL 1.1 - Blend (c) Non Fungible Trading Ltd.
pragma solidity ^0.8.0;

// solhint-disable no-inline-assembly
library BlendHelpers {
    int256 private constant _YEAR_WAD = 365 days * 1e18;
    uint256 private constant _LIQUIDATION_THRESHOLD = 100_000;
    uint256 private constant _BASIS_POINTS = 10_000;

    address public constant _BLUR_POOL = 0x0000000000A39bb272e79075ade125fd351887Ac;

    address public constant _WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    error InvalidExecution();

    /**
     * @dev Computes the current debt of a borrow given the last time it was touched and the last computed debt.
     * @param amount Principal in ETH
     * @param startTime Start time of the loan
     * @param rate Interest rate (in bips)
     * @dev Formula: https://www.desmos.com/calculator/l6omp0rwnh
     */
    function computeCurrentDebt(uint256 amount, uint256 rate, uint256 startTime) internal view returns (uint256) {
        uint256 loanTime = block.timestamp - startTime;
        int256 yearsWad = wadDiv(int256(loanTime) * 1e18, _YEAR_WAD);
        return uint256(wadMul(int256(amount), wadExp(wadMul(yearsWad, bipsToSignedWads(rate)))));
    }

    /**
     * @dev Converts an integer bips value to a signed wad value.
     */
    function bipsToSignedWads(uint256 bips) internal pure returns (int256) {
        return int256((bips * 1e18) / _BASIS_POINTS);
    }

    function wadMul(int256 x, int256 y) internal pure returns (int256 r) {
        /// @solidity memory-safe-assembly
        assembly {
            // Store x * y in r for now.
            r := mul(x, y)

            // Combined overflow check (`x == 0 || (x * y) / x == y`) and edge case check
            // where x == -1 and y == type(int256).min, for y == -1 and x == min int256,
            // the second overflow check will catch this.
            // See:
            // https://secure-contracts.com/learn_evm/arithmetic-checks.html#arithmetic-checks-for-int256-multiplication
            // Combining into 1 expression saves gas as resulting bytecode will only have 1 `JUMPI`
            // rather than 2.
            if iszero(
                and(
                    or(iszero(x), eq(sdiv(r, x), y)),
                    or(lt(x, not(0)), sgt(y, 0x8000000000000000000000000000000000000000000000000000000000000000))
                )
            ) {
                revert(0, 0)
            }

            // Scale the result down by 1e18.
            r := sdiv(r, 1000000000000000000)
        }
    }

    function wadDiv(int256 x, int256 y) internal pure returns (int256 r) {
        /// @solidity memory-safe-assembly
        assembly {
            // Store x * 1e18 in r for now.
            r := mul(x, 1000000000000000000)

            // Equivalent to require(y != 0 && ((x * 1e18) / 1e18 == x))
            if iszero(and(iszero(iszero(y)), eq(sdiv(r, 1000000000000000000), x))) {
                revert(0, 0)
            }

            // Divide r by y.
            r := sdiv(r, y)
        }
    }

    function wadExp(int256 x) internal pure returns (int256 r) {
        unchecked {
            // When the result is < 0.5 we return zero. This happens when
            // x <= floor(log(0.5e18) * 1e18) ~ -42e18
            if (x <= -42139678854452767551) return 0;

            // When the result is > (2**255 - 1) / 1e18 we can not represent it as an
            // int. This happens when x >= floor(log((2**255 - 1) / 1e18) * 1e18) ~ 135.
            // solhint-disable-next-line custom-errors
            if (x >= 135305999368893231589) revert("EXP_OVERFLOW");

            // x is now in the range (-42, 136) * 1e18. Convert to (-42, 136) * 2**96
            // for more intermediate precision and a binary basis. This base conversion
            // is a multiplication by 1e18 / 2**96 = 5**18 / 2**78.
            x = (x << 78) / 5 ** 18;

            // Reduce range of x to (-½ ln 2, ½ ln 2) * 2**96 by factoring out powers
            // of two such that exp(x) = exp(x') * 2**k, where k is an integer.
            // Solving this gives k = round(x / log(2)) and x' = x - k * log(2).
            int256 k = ((x << 96) / 54916777467707473351141471128 + 2 ** 95) >> 96;
            x = x - k * 54916777467707473351141471128;

            // k is in the range [-61, 195].

            // Evaluate using a (6, 7)-term rational approximation.
            // p is made monic, we'll multiply by a scale factor later.
            int256 y = x + 1346386616545796478920950773328;
            y = ((y * x) >> 96) + 57155421227552351082224309758442;
            int256 p = y + x - 94201549194550492254356042504812;
            p = ((p * y) >> 96) + 28719021644029726153956944680412240;
            p = p * x + (4385272521454847904659076985693276 << 96);

            // We leave p in 2**192 basis so we don't need to scale it back up for the division.
            int256 q = x - 2855989394907223263936484059900;
            q = ((q * x) >> 96) + 50020603652535783019961831881945;
            q = ((q * x) >> 96) - 533845033583426703283633433725380;
            q = ((q * x) >> 96) + 3604857256930695427073651918091429;
            q = ((q * x) >> 96) - 14423608567350463180887372962807573;
            q = ((q * x) >> 96) + 26449188498355588339934803723976023;

            /// @solidity memory-safe-assembly
            assembly {
                // Div in assembly because solidity adds a zero check despite the unchecked.
                // The q polynomial won't have zeros in the domain as all its roots are complex.
                // No scaling is necessary because p is already 2**96 too large.
                r := sdiv(p, q)
            }

            // r should be in the range (0.09, 0.25) * 2**96.

            // We now need to multiply r by:
            // * the scale factor s = ~6.031367120.
            // * the 2**k factor from the range reduction.
            // * the 1e18 / 2**96 factor for base conversion.
            // We do this all at once, with an intermediate result in 2**213
            // basis, so the final right shift is always by a positive amount.
            r = int256((uint256(r) * 3822833074963236453042738258902158003155416615667) >> uint256(195 - k));
        }
    }
}
