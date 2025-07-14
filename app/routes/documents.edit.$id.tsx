import type { MetaFunction, LoaderFunction, ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "~/components/Layout";
import { apiGet, apiPut } from "~/utils/api";
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

// Action function to handle form submission
export const action: ActionFunction = async ({ request, params }) => {
  const { id } = params;
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const tagsString = formData.get("tags") as string;

  // Validate form data
  const errors: Record<string, string> = {};
  if (!title || title.trim() === "") {
    errors.title = "タイトルは必須です";
  }
  if (!content || content.trim() === "") {
    errors.content = "内容は必須です";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors, values: { title, content, tagsString } });
  }

  // Process tags
  const tags = tagsString
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag !== "");

  try {
    const clientState = await loadClientState();
    await apiPut(clientState, `documents/${id}`, {
      id,
      title,
      content,
      tags
    });

    // Redirect to the document details page after successful update
    return redirect(`/documents/${id}`);
  } catch (error) {
    console.error("Failed to update document:", error);
    return json({
      errors: { form: "ドキュメントの更新に失敗しました。" },
      values: { title, content, tagsString }
    });
  }
};

export const meta: MetaFunction = ({ data }) => {
  const document = data?.document as Document | null;
  return [
    { title: document ? `keruta管理パネル - ${document.title}の編集` : "keruta管理パネル - ドキュメント編集" },
    { name: "description", content: "ドキュメントの編集" },
  ];
};

export default function EditDocument() {
  const { document, error: loaderError } = useLoaderData<{ document: Document | null, error: string | null }>();
  const actionData = useActionData<{
    errors?: Record<string, string>;
    values?: { title: string; content: string; tagsString: string };
  }>();
  const navigate = useNavigate();

  // State for form fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsString, setTagsString] = useState("");

  // Initialize form fields with document data or action data
  useEffect(() => {
    if (actionData?.values) {
      setTitle(actionData.values.title);
      setContent(actionData.values.content);
      setTagsString(actionData.values.tagsString);
    } else if (document) {
      setTitle(document.title);
      setContent(document.content);
      setTagsString(document.tags.join(", "));
    }
  }, [document, actionData]);

  return (
    <Layout>
      <div className="edit-document">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>ドキュメント編集</h2>
          <div>
            {document && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate(`/documents/${document.id}`)}
              >
                キャンセル
              </button>
            )}
          </div>
        </div>

        {loaderError && (
          <div className="alert alert-danger" role="alert">
            {loaderError}
          </div>
        )}

        {actionData?.errors?.form && (
          <div className="alert alert-danger" role="alert">
            {actionData.errors.form}
          </div>
        )}

        {document ? (
          <div className="card">
            <div className="card-body">
              <Form method="post">
                <div className="mb-3">
                  <label htmlFor="title" className="form-label">タイトル</label>
                  <input
                    type="text"
                    className={`form-control ${actionData?.errors?.title ? "is-invalid" : ""}`}
                    id="title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  {actionData?.errors?.title && (
                    <div className="invalid-feedback">
                      {actionData.errors.title}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="content" className="form-label">内容</label>
                  <textarea
                    className={`form-control ${actionData?.errors?.content ? "is-invalid" : ""}`}
                    id="content"
                    name="content"
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  ></textarea>
                  {actionData?.errors?.content && (
                    <div className="invalid-feedback">
                      {actionData.errors.content}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="tags" className="form-label">タグ (カンマ区切り)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="tags"
                    name="tags"
                    placeholder="技術文書, API仕様, ユーザーガイド"
                    value={tagsString}
                    onChange={(e) => setTagsString(e.target.value)}
                  />
                  <div className="form-text">
                    複数のタグはカンマ (,) で区切ってください。
                  </div>
                </div>

                <div className="d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(`/documents/${document.id}`)}
                  >
                    キャンセル
                  </button>
                  <button type="submit" className="btn btn-primary">
                    保存
                  </button>
                </div>
              </Form>
            </div>
          </div>
        ) : !loaderError && (
          <div className="alert alert-info">
            ドキュメントを読み込んでいます...
          </div>
        )}
      </div>
    </Layout>
  );
}
