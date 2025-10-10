import DataTable from "../pages/admin/dataTable";

function ListContactPeople() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchContactPeople = async () => {
    setLoading(true);
    setErrorMsg('');
    try {

      const { data, error } = await supabase
        .from('contact_people')
        .select('id, name, phone, email, city, city_rel:cities(name)');

      if (error) throw error;

      const mapped = (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        city: r?.city_rel?.[0]?.name || r?.city_rel?.name || r.city || '',
      }));

      mapped.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'));
      setRows(mapped);
    } catch (err) {
      console.error('Error:', err);
      setErrorMsg('Nie udało się pobrać listy osób kontaktowych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactPeople();
  }, []);

  const handleDeleteContactPerson = async (id) => {
    try {
      const { error } = await supabase.from('contact_people').delete().eq('id', id);
      if (error) throw error;
      fetchContactPeople();
    } catch (err) {
      console.error('Error: ', err);
      setErrorMsg('Nie udało się usunąć rekordu.');
    }
  };

  const handleEditContactPerson = () => {
  };

  const columns = useMemo(
    () => [
      { Header: 'ID', accessor: 'id' },
      { Header: 'Imię i nazwisko', accessor: 'name' },
      { Header: 'Miasto', accessor: 'city' },
      { Header: 'Telefon', accessor: 'phone' },
      { Header: 'Email', accessor: 'email' },
    ],
    []
  );

  return (
    <DataTable
      title="Osoby kontaktowe"
      columns={columns}
      records={rows}
      handleDelete={handleDeleteContactPerson}
      handleEdit={handleEditContactPerson}  
      fetch={fetchContactPeople}
      loading={loading}
      errorMessage={errorMsg}
    />
  );
}

export default ListContactPeople;
