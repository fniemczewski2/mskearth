import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

function DataTable({
  columns,           
  records,
  handleDelete,
  handleEdit,
  handleAccept = null,
  handlePinn = null,
  title,
  fetch = () => {},  
}) {
  const data = useMemo(() => records ?? [], [records]);

  const userColumns = useMemo(() => {
    return (columns ?? []).map((col, idx) => {

      const header = col.header ?? col.Header;
      const cell = col.cell ?? col.Cell;
      const accessorKey = col.accessorKey ?? col.accessor;
      const base = { ...col, header, cell, accessorKey };
      const headerIsString = typeof base.header === "string";

      if (!base.id) {

        const fallbackId =
          (typeof accessorKey === "string" && accessorKey) ||
          (typeof base.header === "string" && base.header.toLowerCase().replace(/\s+/g, "_")) ||
          `col_${idx}`;

        if (!headerIsString) {
          return { ...base, id: fallbackId };
        }
        return { ...base, id: fallbackId };
      }

      return base;
    });
  }, [columns]);


  const actionsColumn = useMemo(
    () => ({
      id: "actions",                 
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

  const cols = useMemo(() => [...userColumns, actionsColumn], [userColumns, actionsColumn]);

  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns: cols,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
                const sorted = header.column.getIsSorted(); 

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
