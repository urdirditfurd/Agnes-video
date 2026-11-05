"""Initial schema: settings, api_credentials, trades, bot_logs."""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("bot_status", sa.String(length=32), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("timeframe", sa.String(length=8), nullable=False),
        sa.Column("trade_size_usd", sa.Float(), nullable=False),
        sa.Column("rsi_period", sa.Integer(), nullable=False),
        sa.Column("rsi_threshold", sa.Float(), nullable=False),
        sa.Column("bb_period", sa.Integer(), nullable=False),
        sa.Column("bb_std", sa.Float(), nullable=False),
        sa.Column("stop_loss_pct", sa.Float(), nullable=False),
        sa.Column("take_profit_pct", sa.Float(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "api_credentials",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("api_key_encrypted", sa.Text(), nullable=False),
        sa.Column("api_secret_encrypted", sa.Text(), nullable=False),
        sa.Column("is_testnet", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("label", name="uq_api_credentials_label"),
    )

    op.create_table(
        "trades",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("side", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("entry_price", sa.Float(), nullable=False),
        sa.Column("exit_price", sa.Float(), nullable=True),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("size_usd", sa.Float(), nullable=False),
        sa.Column("stop_loss", sa.Float(), nullable=False),
        sa.Column("take_profit", sa.Float(), nullable=False),
        sa.Column("pnl_usd", sa.Float(), nullable=True),
        sa.Column("pnl_pct", sa.Float(), nullable=True),
        sa.Column("exchange_order_id", sa.String(length=128), nullable=True),
        sa.Column("reason", sa.String(length=128), nullable=True),
        sa.Column(
            "opened_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trades_status", "trades", ["status"])
    op.create_index("ix_trades_opened_at", "trades", ["opened_at"])

    op.create_table(
        "bot_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("level", sa.String(length=16), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bot_logs_created_at", "bot_logs", ["created_at"])

    # Ligne settings singleton (id=1) avec defaults stratégie
    op.execute(
        """
        INSERT INTO settings (
            id, bot_status, symbol, timeframe, trade_size_usd,
            rsi_period, rsi_threshold, bb_period, bb_std,
            stop_loss_pct, take_profit_pct
        ) VALUES (
            1, 'stopped', 'BTC/USDT', '15m', 200.0,
            14, 30.0, 20, 2.0,
            2.0, 5.0
        )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_bot_logs_created_at", table_name="bot_logs")
    op.drop_table("bot_logs")
    op.drop_index("ix_trades_opened_at", table_name="trades")
    op.drop_index("ix_trades_status", table_name="trades")
    op.drop_table("trades")
    op.drop_table("api_credentials")
    op.drop_table("settings")
