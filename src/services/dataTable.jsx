// src/components/dataTable.jsx
import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

function DataTable({
  columns,            // ColumnDef[] (v8) or legacy v7-like defs
  records,
  handleDelete,
  handleEdit,
  handleAccept = null,
  handlePinn = null,
  title,
  fetch = () => {},   // safe default
}) {
  const data = useMemo(() => records ?? [], [records]);

  // --- Normalize user columns to v8 and ensure each has a stable id when header is non-string
  const userColumns = useMemo(() => {
    return (columns ?? []).map((col, idx) => {
      // Accept v7 and v8 props
      const header = col.header ?? col.Header;
      const cell = col.cell ?? col.Cell;
      const accessorKey = col.accessorKey ?? col.accessor;

      // Start with the original but normalized keys
      const base = { ...col, header, cell, accessorKey };

      // TanStack v8 requires an id when header is not a plain string
      const headerIsString = typeof base.header === "string";

      if (!base.id) {
        // Prefer accessorKey if it's a string; otherwise synthesize
        const fallbackId =
          (typeof accessorKey === "string" && accessorKey) ||
          (typeof base.header === "string" && base.header.toLowerCase().replace(/\s+/g, "_")) ||
          `col_${idx}`;

        if (!headerIsString) {
          return { ...base, id: fallbackId };
        }
        // If header is a string and no id, not strictly required—but we can still add one for stability
        return { ...base, id: fallbackId };
      }

      return base;
    });
  }, [columns]);

  // --- Internal actions column (always last) ---
  const actionsColumn = useMemo(
    () => ({
      id: "actions",                 // explicit id (string header below, so safe)
      header: "Akcje",
      enableSorting: false,
      cell: ({ row }) => {
        const original = row.original ?? {};
        const id = original.id ?? row.id;

        const accepted =
          typeof original.accepted === "string"
            ? original.accepted !== "false"
            : Boolean(original.accepted);
        const pinned = Boolean(original.pinned);

        return (
          <div className="alterButtonsContainer">
            {typeof handleAccept === "function" && (
              <button
                onClick={() => handleAccept(id)}
                className="alterRecordBtn"
                type="button"
                aria-label={accepted ? "Ukryj rekord" : "Zatwierdź rekord"}
                title={accepted ? "Ukryj" : "Zatwierdź"}
              >
                {accepted ? (
                  <i className="bi bi-eye-slash-fill" aria-hidden="true"></i>
                ) : (
                  <i className="bi bi-send-check-fill" aria-hidden="true"></i>
                )}
              </button>
            )}

            {typeof handlePinn === "function" && (
              <button
                onClick={() => handlePinn(id)}
                className="alterRecordBtn"
                type="button"
                aria-label={pinned ? "Odepnij rekord" : "Przypnij rekord"}
                title={pinned ? "Odepnij" : "Przypnij"}
              >
                {pinned ? (
                  <i className="bi bi-pin-angle" aria-hidden="true"></i>
                ) : (
                  <i className="bi bi-pin-fill" aria-hidden="true"></i>
                )}
              </button>
            )}

            <button
              onClick={() => handleEdit(id)}
              className="alterRecordBtn"
              type="button"
              // Leave disabled if edit flow isn't ready; otherwise remove
              disabled
              aria-label="Edytuj rekord"
              title="Edytuj"
            >
              <i className="bi bi-pencil-fill" aria-hidden="true"></i>
            </button>

            <button
              onClick={() => handleDelete(id)}
              className="alterRecordBtn"
              type="button"
              aria-label="Usuń rekord"
              title="Usuń"
            >
              <i className="bi bi-trash-fill" aria-hidden="true"></i>
            </button>
          </div>
        );
      },
    }),
    [handleAccept, handlePinn, handleEdit, handleDelete]
  );

  // Combine columns + actions
  const cols = useMemo(() => [...userColumns, actionsColumn], [userColumns, actionsColumn]);

  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns: cols,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // You can set defaultColumn here if needed, e.g., enableSorting by default
  });

  return (
    <section className="dataTable">
      <h3 className="tableTitle">
        {title}
        <button
          className="refreshBtn"
          onClick={fetch}
          type="button"
          aria-label="Odśwież dane"
          title="Odśwież"
        >
          <i className="bi bi-arrow-repeat" aria-hidden="true"></i>
        </button>
      </h3>

      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted(); // 'asc' | 'desc' | false

                return (
                  <th
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    style={{ cursor: canSort ? "pointer" : "default" }}
                    scope="col"
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                        ? "descending"
                        : "none"
                    }
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {canSort && (
                      <span style={{ marginLeft: 6 }}>
                        {sorted === "desc" ? (
                          <i className="bi bi-caret-down-fill" aria-hidden="true"></i>
                        ) : sorted === "asc" ? (
                          <i className="bi bi-caret-up-fill" aria-hidden="true"></i>
                        ) : (
                          ""
                        )}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object),
  records: PropTypes.arrayOf(PropTypes.object),
  handleDelete: PropTypes.func.isRequired,
  handleEdit: PropTypes.func.isRequired,
  handleAccept: PropTypes.func,
  handlePinn: PropTypes.func,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  fetch: PropTypes.func,
};

export default DataTable;
