import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase, toPublicUrl } from "./supabaseClient";
import DataTable from "./dataTable";

function ListArticles() {
  const [articles, setArticles] = useState([]);

  const safeSub = (v, n = 10) => (v ? String(v).substring(0, n) : "");

  const fetchArticles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(
          `
            id,
            title,
            subtitle,
            content,
            author,
            created,
            accepted,
            published,
            sourcelink,
            sourcetext,
            imgurl,
            pinned
          `
        )
        .order("created", { ascending: false });

      if (error) throw error;

      const list = (data || []).map((article) => {
        const paths = Array.isArray(article.imgurl) ? article.imgurl : (article.imgurl ? [article.imgurl] : []);
        const resolved = paths.map((p) => toPublicUrl(p, "mskearth")).filter(Boolean);

        return {
          ...article,
          // keep original fields for table cells:
          sourceLink: article.sourcelink || null,
          sourceText: article.sourcetext || null,
          imgurl: resolved,
          isExpanded: false,
        };
      });

      // newest first (already ordered, but keep it explicit)
      list.sort((a, b) => String(b.created).localeCompare(String(a.created)));
      setArticles(list);
    } catch (err) {
      console.error("Error:", err);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleDeleteArticle = async (articleId) => {
    try {
      const { error } = await supabase.from("articles").delete().eq("id", articleId);
      if (error) throw error;
      fetchArticles();
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  const handleAcceptArticle = async (articleId) => {
    try {
      const { data: existing, error: getErr } = await supabase
        .from("articles")
        .select("id, accepted")
        .eq("id", articleId)
        .single();
      if (getErr) throw getErr;

      const nextAccepted = existing?.accepted ? false : true; // boolean toggle
      const { error: updErr } = await supabase
        .from("articles")
        .update({ accepted: nextAccepted })
        .eq("id", articleId);

      if (updErr) throw updErr;
      fetchArticles();
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  const handlePinnArticle = async (articleId) => {
    try {
      const { data: existing, error: getErr } = await supabase
        .from("articles")
        .select("id, pinned")
        .eq("id", articleId)
        .single();
      if (getErr) throw getErr;

      const { error: updErr } = await supabase
        .from("articles")
        .update({ pinned: !existing?.pinned })
        .eq("id", articleId);

      if (updErr) throw updErr;
      fetchArticles();
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  const handleEditArticle = () => {
    // TODO: navigate(`/admin/articles/${articleId}/edit`)
  };

  const toggleText = (id) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isExpanded: !a.isExpanded } : a))
    );
  };

  // ✅ TanStack Table v8 column defs
  const columns = useMemo(
    () => [
      { header: "Tytuł", accessorKey: "title" },
      {
        header: "Podtytuł",
        accessorKey: "subtitle",
        cell: ({ row }) => {
          const v = row.original.subtitle;
          return v != null ? (row.original.isExpanded ? v : safeSub(v)) : null;
        },
      },
      {
        header: "Treść",
        accessorKey: "content",
        cell: ({ row }) =>
          row.original.isExpanded ? row.original.content : safeSub(row.original.content),
      },
      {
        header: "Autor",
        accessorKey: "author",
        cell: ({ row }) => {
          const v = row.original.author;
          return v != null ? (row.original.isExpanded ? v : safeSub(v)) : null;
        },
      },
      {
        header: "Utworzono",
        accessorKey: "created",
        cell: ({ getValue }) => {
          const v = getValue();
          return <p>{String(v ?? "").split("T")[0]}</p>;
        },
      },
      {
        header: "Akceptacja",
        accessorKey: "accepted",
        cell: ({ getValue }) => (getValue() ? "true" : "false"),
      },
      {
        header: "Publikacja",
        accessorKey: "published",
        cell: ({ getValue }) => {
          const v = getValue();
          return <p>{v ? String(v).split("T")[0] : ""}</p>;
        },
      },
      {
        header: "Źródło (link)",
        accessorKey: "sourceLink",
        cell: ({ row }) => {
          const v = row.original.sourceLink;
          return v != null ? (row.original.isExpanded ? v : safeSub(v)) : null;
        },
      },
      {
        header: "Źródło (tekst)",
        accessorKey: "sourceText",
        cell: ({ row }) => {
          const v = row.original.sourceText;
          return v != null ? (row.original.isExpanded ? v : safeSub(v)) : null;
        },
      },
      {
        header: "Obraz",
        accessorKey: "imgurl",
        cell: ({ row }) => {
          const images = row.original.imgurl || [];
          const isExpanded = row.original.isExpanded;
          return (
            <div>
              {images.length > 0 ? (
                <>
                  <img
                    src={images[0]}
                    alt={
                      row.original.title
                        ? `Miniatura artykułu "${row.original.title}"`
                        : "Miniatura artykułu"
                    }
                    style={
                      isExpanded
                        ? { maxWidth: "320px", maxHeight: "180px", objectFit: "cover" }
                        : { width: "32px", height: "32px", objectFit: "cover" }
                    }
                    loading="lazy"
                    width={isExpanded ? undefined : 32}
                    height={isExpanded ? undefined : 32}
                  />
                  {images.length > 1 && (
                    <span aria-label={`+${images.length - 1} obraz(y)`}>
                      +{images.length - 1}
                    </span>
                  )}
                </>
              ) : (
                <span>0</span>
              )}
            </div>
          );
        },
      },
      {
        header: "Więcej",
        accessorKey: "id",
        cell: ({ row }) => (
          <button
            className="alterRecordBtn"
            onClick={() => toggleText(row.original.id)}
            aria-expanded={row.original.isExpanded ? "true" : "false"}
            aria-label={row.original.isExpanded ? "Zwiń szczegóły" : "Rozwiń szczegóły"}
            title={row.original.isExpanded ? "Zwiń" : "Rozwiń"}
            type="button"
          >
            {row.original.isExpanded ? (
              <i className="bi bi-chevron-up" aria-hidden="true" />
            ) : (
              <i className="bi bi-chevron-down" aria-hidden="true" />
            )}
          </button>
        ),
      },
    ],
    [] // columns are static; row state is read from row.original
  );

  return (
    <DataTable
      columns={columns}
      records={articles}
      handleDelete={handleDeleteArticle}
      handleEdit={handleEditArticle}
      handleAccept={handleAcceptArticle}
      handlePinn={handlePinnArticle}
      title="Artykuły"
      fetch={fetchArticles}
    />
  );
}

export default ListArticles;
