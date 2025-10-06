import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import DataTable from './dataTable';

function ListLocalContactPeople() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLocalContactPeople = async () => {
    setLoading(true);
    setErrorMsg('');
    try {

      const { data, error } = await supabase
        .from('local_contact_people')
        .select('id, name, facebook, phone, email, city, city_rel:cities(name)');

      if (error) throw error;

      // Normalize city to a string regardless of schema (FK or plain text)
      const rows = (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        facebook: r.facebook,
        phone: r.phone,
        email: r.email,
        city: r?.city_rel?.[0]?.name || r?.city_rel?.name || r.city || '',
      }));

      // Optional: sort by city, then name (Polish locale)
      rows.sort((a, b) => {
        const byCity = (a.city || '').localeCompare(b.city || '', 'pl');
        if (byCity !== 0) return byCity;
        return (a.name || '').localeCompare(b.name || '', 'pl');
      });

      setPeople(rows);
    } catch (err) {
      console.error('Error:', err);
      setErrorMsg('Nie udało się pobrać listy osób kontaktowych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalContactPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteLocalContactPerson = async (id) => {
    try {
      const { error } = await supabase.from('local_contact_people').delete().eq('id', id);
      if (error) throw error;
      fetchLocalContactPeople();
    } catch (err) {
      console.error('Error:', err);
      setErrorMsg('Nie udało się usunąć rekordu.');
    }
  };

  const handleEditLocalContactPerson = () => {
    // Podłącz tu modal/route do edycji, np. navigate(`/admin/local-contacts/${id}`)
  };

  const columns = useMemo(
    () => [
      { Header: 'ID', accessor: 'id' },
      { Header: 'Imię i nazwisko', accessor: 'name' },
      {
        Header: 'Facebook',
        accessor: 'facebook',
        Cell: ({ value }) =>
          value ? (
            <a
              href={/^https?:\/\//i.test(value) ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Otwórz profil na Facebooku"
            >
              {value}
            </a>
          ) : (
            <span>—</span>
          ),
      },
      { Header: 'Telefon', accessor: 'phone' },
      { Header: 'Email', accessor: 'email' },
      { Header: 'Miasto', accessor: 'city' },
    ],
    []
  );

  return (
    <DataTable
      title="Osoby kontaktowe"
      columns={columns}
      records={people}
      handleDelete={handleDeleteLocalContactPerson}
      handleEdit={handleEditLocalContactPerson}
      fetch={fetchLocalContactPeople}
      loading={loading}
      errorMessage={errorMsg}
    />
  );
}

export default ListLocalContactPeople;
