import DataTable from "../pages/admin/dataTable";

const toUrl = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

function ListCities() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCities = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, facebook, instagram, meetings, voivodeship');
      if (error) throw error;

      const rows = (data || []).map((r) => ({
        id: r.id,
        name: r.name || '',
        facebook: r.facebook || '',
        instagram: r.instagram || '',
        meetings: r.meetings || '',
        voivodeship: r.voivodeship || '',
      }));

      const collator = new Intl.Collator('pl', { sensitivity: 'base' });
      rows.sort(
        (a, b) =>
          collator.compare(a.voivodeship, b.voivodeship) ||
          collator.compare(a.name, b.name)
      );

      setCities(rows);
    } catch (err) {
      console.error('Error:', err);
      setErrorMsg('Nie udało się pobrać listy grup lokalnych.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  const handleDeleteCity = useCallback(
    async (id) => {
      try {
        const { error } = await supabase.from('cities').delete().eq('id', id);
        if (error) throw error;
        fetchCities();
      } catch (err) {
        console.error('Error: ', err);
        setErrorMsg('Nie udało się usunąć rekordu.');
      }
    },
    [fetchCities]
  );

  const handleEditCity = useCallback(() => {
    // TODO: open edit modal / navigate(`/admin/cities/${id}`)
  }, []);

  // TanStack Table v8 columns
  const columns = useMemo(
    () => [
      { header: 'ID', accessorKey: 'id' },
      { header: 'Nazwa', accessorKey: 'name' },
      {
        id: 'facebook',
        header: 'Facebook',
        accessorKey: 'facebook',
        cell: (info) => {
          const value = info.getValue();
          const row = info.row.original;
          if (!value) return <span>—</span>;
          return (
            <a
              href={toUrl(String(value))}
              target="_blank"
              rel="noopener noreferrer"
              title={`Facebook: ${row.name}`}
            >
              Otwórz
            </a>
          );
        },
      },
      {
        id: 'instagram',
        header: 'Instagram',
        accessorKey: 'instagram',
        cell: (info) => {
          const value = info.getValue();
          const row = info.row.original;
          if (!value) return <span>—</span>;
          return (
            <a
              href={toUrl(String(value))}
              target="_blank"
              rel="noopener noreferrer"
              title={`Instagram: ${row.name}`}
            >
              Otwórz
            </a>
          );
        },
      },
      { header: 'Spotkania', accessorKey: 'meetings' },
      { header: 'Województwo', accessorKey: 'voivodeship' },
    ],
    []
  );

  return (
    <DataTable
      title="Grupy lokalne"
      columns={columns}
      records={cities}
      handleDelete={handleDeleteCity}
      handleEdit={handleEditCity}
      fetch={fetchCities}
      loading={loading}
      errorMessage={errorMsg}
      emptyMessage="Brak grup lokalnych do wyświetlenia."
    />
  );
}

export default ListCities;
