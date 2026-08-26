import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  name: 'collection_stats',
  expression: `
    WITH market_active_loans AS (
      SELECT *
      FROM market_loans
      WHERE status = 'active'
    ),
    market_loans_totals AS (
      SELECT SUM(repayment_max_usd) AS total_usd
      FROM market_active_loans
    )
    SELECT
      assets.collection_id AS collection_id,
      COUNT(*) AS count,
      SUM(loans.repayment_max_usd) AS total_usd,
      AVG(loans.repayment_max_usd) AS avg_usd,
      AVG(loans.apr) AS avg_apr,
      AVG(loans.duration)::int AS avg_duration,
      SUM(loans.repayment_max_usd) / NULLIF((SELECT total_usd FROM market_loans_totals), 0) AS market_pct
    FROM market_active_loans loans
    INNER JOIN collection_assets assets
      ON loans.asset_id = assets.id
    GROUP BY assets.collection_id
  `
})
export class CollectionStats {
  @ViewColumn({ name: 'collection_id' })
  collectionId: number;

  @ViewColumn()
  count: number;

  @ViewColumn({ name: 'total_usd' })
  totalUsd: number;

  @ViewColumn({ name: 'avg_usd' })
  averageUsd: number;

  @ViewColumn({ name: 'avg_apr' })
  averageApr: number;

  @ViewColumn({ name: 'avg_duration' })
  averageDuration: number;

  @ViewColumn({ name: 'market_pct' })
  marketPct: number;
}
