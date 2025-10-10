import { toPublicUrl } from "./supabaseClient";
import DataTable from "../pages/admin/dataTable";

function ListFoundationBoardMembers() {
  const [foundationBoardMembers, setFoundationBoardMembers] = useState([]);

  const fetchFoundationBoardMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("foundation_board_members")
        .select("id, name, role, description, phone, email, img_path");

      if (error) throw error;

      const list = (data || []).map((member) => ({
        ...member,
        img_path: member?.img_path ? toPublicUrl(member.img_path, "mskearth") : null,
        isExpanded: false,
      }));

      list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pl"));
      setFoundationBoardMembers(list);
    } catch (err) {
      console.error("Error:", err);
    }
  }, []);

  useEffect(() => {
    fetchFoundationBoardMembers();
  }, [fetchFoundationBoardMembers]);

  const handleDeleteFoundationBoardMember = async (id) => {
    try {
      const { error } = await supabase
        .from("foundation_board_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
      fetchFoundationBoardMembers();
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  const handleEditFoundationBoardMember = () => {
  };

  const columns = useMemo(
    () => [
      { header: "ID", accessorKey: "id" },
      { header: "Imię i nazwisko", accessorKey: "name" },
      { header: "Funkcja", accessorKey: "role" },
      { header: "Opis", accessorKey: "description" },
      { header: "Telefon", accessorKey: "phone" },
      { header: "Email", accessorKey: "email" },
      {
        header: "Zdjęcie",
        accessorKey: "img_path",
        cell: ({ row, getValue }) => {
          const value = getValue();
          return value ? (
            <img
              src={value}
              alt={
                row?.original?.name
                  ? `Zdjęcie: ${row.original.name}`
                  : "Zdjęcie członka zarządu"
              }
              width={50}
              height={50}
              loading="lazy"
              style={{ objectFit: "cover", borderRadius: 6 }}
            />
          ) : (
            <span>—</span>
          );
        },
      },
    ],
    []
  );

  return (
    <DataTable
      title="Zarząd fundacji"
      columns={columns}
      records={foundationBoardMembers}
      handleDelete={handleDeleteFoundationBoardMember}
      handleEdit={handleEditFoundationBoardMember}
      fetch={fetchFoundationBoardMembers}
    />
  );
}

export default ListFoundationBoardMembers;
