import DataTable from "../pages/admin/dataTable";

const toUrl = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

function ListCalls() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('recrutation_calls')
        .select('id, date, time, link');
      if (error) throw error;

      const rows = (data || []).map((r) => ({
        id: r.id,
        date: r.date || '',
        time: r.time || '',
        link: r.link || '',
      }));

      rows.sort((a, b) => {
        const ad = String(a.date);
        const bd = String(b.date);
        if (ad !== bd) return ad.localeCompare(bd);
        return String(a.time).localeCompare(String(b.time));
      });

      setCalls(rows);
    } catch (err) {
      console.error('Error:', err);
      setErrorMsg('Nie udało się pobrać listy calli.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleDeleteCall = useCallback(
    async (id) => {
      try {
        const { error } = await supabase.from('recrutation_calls').delete().eq('id', id);
        if (error) throw error;
        fetchCalls();
      } catch (err) {
        console.error('Error: ', err);
        setErrorMsg('Nie udało się usunąć rekordu.');
      }
    },
    [fetchCalls]
  );

  const handleEditCall = useCallback(() => {

  }, []);

  const columns = useMemo(
    () => [
      { header: 'ID', accessorKey: 'id' },
      { header: 'Data', accessorKey: 'date' },
      { header: 'Godzina', accessorKey: 'time' },
      {
        id: 'link',
        header: 'Link',
        accessorKey: 'link',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return <span>—</span>;
          return (
            <a
              href={toUrl(String(value))}
              target="_blank"
              rel="noopener noreferrer"
              title="Otwórz link do spotkania"
            >
              Otwórz
            </a>
          );
        },
      },
    ],
    []
  );

  return (
    <DataTable
      title="Calle"
      columns={columns}
      records={calls}
      handleDelete={handleDeleteCall}
      handleEdit={handleEditCall}
      fetch={fetchCalls}
      loading={loading}
      errorMessage={errorMsg}
      emptyMessage="Brak calli do wyświetlenia."
    />
  );
}

export default ListCalls;
