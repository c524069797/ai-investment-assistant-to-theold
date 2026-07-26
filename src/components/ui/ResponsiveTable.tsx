"use client";

import { useMemo, useState } from "react";
import { Pagination, Table } from "antd";
import type { TableProps } from "antd";
import { useIsMobile } from "@/lib/hooks/useBreakpoint";

/**
 * 响应式表格。
 *
 * 桌面端就是普通的 AntD Table；<768px 时按列定义自动降级成卡片流：
 * - primaryKey 指定的列渲染成卡片标题（通常是"标的/名称"这种）
 * - actionKeys 指定的列放到卡片底部作为操作区
 * - 其余列渲染成「字段名 / 值」两行式条目
 *
 * 这样窄屏不再需要横向滚动多列表格，也不用为每张表单独写一套移动端 UI。
 */

// 内部索引访问用；对外约束放宽为 object，让无索引签名的具名 interface 也能传入。
type AnyRecord = Record<string, unknown>;

// AntD 的 ColumnType 联合类型里 dataIndex/render 都是可选的，这里取需要用到的部分。
interface ColumnLike<T> {
  key?: React.Key;
  dataIndex?: string | number | readonly (string | number)[];
  title?: unknown;
  render?: (value: never, record: T, index: number) => React.ReactNode;
}

interface Props<T> extends Omit<TableProps<T>, "columns" | "pagination"> {
  columns: NonNullable<TableProps<T>["columns"]>;
  dataSource: readonly T[];
  /** 作为卡片标题的列 key/dataIndex，默认取第一列 */
  primaryKey?: string;
  /** 作为卡片底部操作区的列 key，可多个 */
  actionKeys?: string[];
  /** 移动端每页条数 */
  mobilePageSize?: number;
  pagination?: TableProps<T>["pagination"];
}

function columnId<T>(col: ColumnLike<T>, index: number): string {
  if (col.key != null) return String(col.key);
  if (typeof col.dataIndex === "string" || typeof col.dataIndex === "number") {
    return String(col.dataIndex);
  }
  return `col-${index}`;
}

function readValue<T extends object>(record: T, col: ColumnLike<T>): unknown {
  const { dataIndex } = col;
  if (dataIndex == null) return undefined;

  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce<unknown>(
      (acc, key) => (acc == null ? undefined : (acc as AnyRecord)[key as string]),
      record,
    );
  }

  return (record as AnyRecord)[dataIndex as string];
}

function renderCell<T extends object>(
  record: T,
  col: ColumnLike<T>,
  index: number,
): React.ReactNode {
  const value = readValue(record, col);

  if (typeof col.render === "function") {
    return col.render(value as never, record, index);
  }

  return value as React.ReactNode;
}

/** title 可能是 ReactNode 或 (props) => ReactNode，只在是字符串时用作字段名 */
function columnTitle(title: unknown): React.ReactNode {
  if (typeof title === "function") return null;
  return (title ?? null) as React.ReactNode;
}

export default function ResponsiveTable<T extends object>({
  columns,
  dataSource,
  primaryKey,
  actionKeys = ["actions"],
  mobilePageSize = 6,
  rowKey,
  pagination,
  ...tableProps
}: Props<T>) {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);

  const cols = columns as ColumnLike<T>[];

  const { primaryCol, actionCols, fieldCols } = useMemo(() => {
    const ids = cols.map((c, i) => columnId(c, i));
    const primaryIndex = primaryKey ? ids.indexOf(primaryKey) : 0;
    const resolvedPrimary = primaryIndex >= 0 ? primaryIndex : 0;

    return {
      primaryCol: cols[resolvedPrimary],
      actionCols: cols.filter((c, i) => actionKeys.includes(ids[i])),
      fieldCols: cols.filter(
        (c, i) => i !== resolvedPrimary && !actionKeys.includes(ids[i]),
      ),
    };
  }, [cols, primaryKey, actionKeys]);

  const rows = useMemo(() => {
    if (!isMobile) return [];
    const start = (page - 1) * mobilePageSize;
    return dataSource.slice(start, start + mobilePageSize);
  }, [dataSource, isMobile, page, mobilePageSize]);

  if (!isMobile) {
    return (
      <Table<T>
        {...tableProps}
        rowKey={rowKey}
        columns={columns}
        dataSource={dataSource as T[]}
        pagination={pagination}
      />
    );
  }

  const getKey = (record: T, index: number): React.Key => {
    if (typeof rowKey === "function") return rowKey(record, index);
    if (typeof rowKey === "string") return (record as AnyRecord)[rowKey] as React.Key;
    return index;
  };

  return (
    <div className="responsive-table-cards">
      {rows.map((record, index) => (
        <article className="rt-card" key={getKey(record, index)}>
          <div className="rt-card__head">{renderCell(record, primaryCol, index)}</div>

          <dl className="rt-card__fields">
            {fieldCols.map((col, i) => {
              const label = columnTitle(col.title);
              if (label == null) return null;

              return (
                <div className="rt-card__field" key={columnId(col, i)}>
                  <dt className="rt-card__label">{label}</dt>
                  <dd className="rt-card__value">{renderCell(record, col, index)}</dd>
                </div>
              );
            })}
          </dl>

          {actionCols.length ? (
            <div className="rt-card__actions">
              {actionCols.map((col, i) => (
                <span key={columnId(col, i)}>{renderCell(record, col, index)}</span>
              ))}
            </div>
          ) : null}
        </article>
      ))}

      {dataSource.length > mobilePageSize ? (
        <div className="rt-pager">
          <Pagination
            simple
            current={page}
            pageSize={mobilePageSize}
            total={dataSource.length}
            onChange={setPage}
          />
          <span className="rt-pager__total">共 {dataSource.length} 条</span>
        </div>
      ) : null}
    </div>
  );
}
