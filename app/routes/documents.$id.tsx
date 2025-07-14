import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import Layout from "~/components/Layout";
import { apiGet } from "~/utils/api";
import { loadClientState } from "~/components/Client";

// Document type definition based on the backend model
interface Document {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Loader function to fetch document details from the API
export const loader: LoaderFunction = async ({ params }) => {
  const { id } = params;

  try {
    const clientState = await loadClientState();
    const document = await apiGet<Document>(clientState, `documents/${id}`);
    return json({ document, error: null });
  } catch (error) {
    console.error(`Failed to load document with ID ${id}:`, error);
    return json({
      document: null,
      error: "ドキュメントの読み込みに失敗しました。"
    });
  }
};

export const meta: MetaFunction = ({ data }) => {
  const document = data?.document as Document | null;
  return [
    { title: document ? `keruta管理パネル - ${document.title}` : "keruta管理パネル - ドキュメント詳細" },
    { name: "description", content: "ドキュメントの詳細表示" },
  ];
};

export default function DocumentDetails() {
  const { document, error } = useLoaderData<{ document: Document | null, error: string | null }>();

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP");
  };

  return (
    <Layout>
      <div className="document-details">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>ドキュメント詳細</h2>
          <div>
            <Link to="/documents" className="btn btn-outline-secondary me-2">
              一覧に戻る
            </Link>
            {document && (
              <Link to={`/documents/edit/${document.id}`} className="btn btn-primary">
                編集
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {document ? (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{document.title}</h3>
              <div className="text-muted">
                作成日: {formatDate(document.createdAt)} | 更新日: {formatDate(document.updatedAt)}
              </div>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <h5>タグ</h5>
                {document.tags.length > 0 ? (
                  <div>
                    {document.tags.map(tag => (
                      <span className="badge bg-info me-1 mb-1" key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">タグなし</p>
                )}
              </div>

              <div>
                <h5>内容</h5>
                <div className="document-content border rounded p-3 bg-light">
                  {/* Display content with line breaks preserved */}
                  {document.content.split('\n').map((line, index) => (
                    <p key={index} className="mb-1">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : !error && (
          <div className="alert alert-info">
            ドキュメントを読み込んでいます...
          </div>
        )}
      </div>
    </Layout>
  );
}
