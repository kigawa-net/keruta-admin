import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import Layout from "~/components/Layout";
import { apiGet, apiDelete } from "~/utils/api";
import { loadClientState } from "~/components/Client";
import { formatDate } from "~/utils/dateUtils";

// Document type definition based on the backend model
interface Document {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Loader function to fetch documents from the API
export const loader: LoaderFunction = async () => {
  try {
    const clientState = await loadClientState();
    const documents = await apiGet<Document[]>(clientState, "documents");
    return json({ documents, error: null });
  } catch (error) {
    console.error("Failed to load documents:", error);
    return json({ documents: [], error: "ドキュメントの読み込みに失敗しました。" });
  }
};

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - ドキュメント管理" },
    { name: "description", content: "ドキュメントの一覧・新規作成・編集・削除・タグ付け・検索" },
  ];
};

export default function Documents() {
  const { documents, error } = useLoaderData<{ documents: Document[], error: string | null }>();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState("all");

  // Get all unique tags from documents
  const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags)));

  // Handle tag filter change
  const handleTagChange = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Apply filters to documents
  const filteredDocuments = documents.filter(doc => {
    // Apply search filter
    if (searchTerm && !doc.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Apply tag filter
    if (selectedTags.length > 0 && !selectedTags.some(tag => doc.tags.includes(tag))) {
      return false;
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const docDate = new Date(doc.updatedAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dateFilter === "today" && daysDiff > 0) return false;
      if (dateFilter === "week" && daysDiff > 7) return false;
      if (dateFilter === "month" && daysDiff > 30) return false;
      if (dateFilter === "quarter" && daysDiff > 90) return false;
    }

    return true;
  });

  // Handle document deletion
  const handleDelete = async (id: string) => {
    if (!window.confirm("このドキュメントを削除してもよろしいですか？")) {
      return;
    }

    try {
      const clientState = await loadClientState();
      await apiDelete(clientState, `documents/${id}`);
      // Reload the page to refresh the document list
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete document:", error);
      console.error("ドキュメントの削除に失敗しました。");
    }
  };


  return (
    <Layout>
      <div className="documents">
        <h2>ドキュメント管理</h2>


        <div className="d-flex justify-content-between mb-3">
          <div>
            <Link to="/documents/new" className="btn btn-primary me-2">新規ドキュメント作成</Link>
            <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>更新</button>
          </div>
          <div className="d-flex">
            <input
              type="text"
              className="form-control me-2"
              placeholder="ドキュメント検索..."
              aria-label="ドキュメント検索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="btn btn-outline-secondary"
              onClick={() => setSearchTerm("")}
            >
              クリア
            </button>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">フィルター</h5>
              </div>
              <div className="card-body">
                <h6>タグ</h6>
                {allTags.length > 0 ? (
                  allTags.map(tag => (
                    <div className="form-check" key={tag}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`tag-${tag}`}
                        checked={selectedTags.includes(tag)}
                        onChange={() => handleTagChange(tag)}
                      />
                      <label className="form-check-label" htmlFor={`tag-${tag}`}>
                        {tag}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">タグがありません</p>
                )}

                <hr />

                <h6>更新日</h6>
                <div className="mb-3">
                  <select
                    className="form-select"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="all">すべての期間</option>
                    <option value="today">今日</option>
                    <option value="week">過去7日間</option>
                    <option value="month">過去30日間</option>
                    <option value="quarter">過去90日間</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary w-100"
                  onClick={() => {
                    setSelectedTags([]);
                    setDateFilter("all");
                  }}
                >
                  フィルターをリセット
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-9">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">ドキュメント一覧</h5>
              </div>
              <div className="card-body">
                {filteredDocuments.length > 0 ? (
                  <div className="list-group">
                    {filteredDocuments.slice().reverse().map(doc => (
                      <div className="list-group-item list-group-item-action" key={doc.id}>
                        <div className="d-flex w-100 justify-content-between">
                          <h5 className="mb-1">{doc.title}</h5>
                          <small>{formatDate(doc.updatedAt)}</small>
                        </div>
                        <p className="mb-1">{doc.content.length > 100 ? `${doc.content.substring(0, 100)}...` : doc.content}</p>
                        <div>
                          {doc.tags.map(tag => (
                            <span className="badge bg-info me-1" key={tag}>{tag}</span>
                          ))}
                        </div>
                        <div className="mt-2">
                          <Link to={`/documents/${doc.id}`} className="btn btn-sm btn-outline-primary me-1">閲覧</Link>
                          <Link to={`/documents/edit/${doc.id}`} className="btn btn-sm btn-outline-secondary me-1">編集</Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(doc.id)}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">
                    ドキュメントが見つかりません。新しいドキュメントを作成してください。
                  </p>
                )}

                {/* Pagination can be implemented here if needed */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
