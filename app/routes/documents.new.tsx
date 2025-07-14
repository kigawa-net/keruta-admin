import type { MetaFunction, ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import Layout from "~/components/Layout";
import { apiPost } from "~/utils/api";
import { loadClientState } from "~/components/Client";

// Action function to handle form submission
export const action: ActionFunction = async ({ request }) => {
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
    await apiPost(clientState, "documents", {
      title,
      content,
      tags
    });

    // Redirect to the documents list page after successful creation
    return redirect("/documents");
  } catch (error) {
    console.error("Failed to create document:", error);
    return json({
      errors: { form: "ドキュメントの作成に失敗しました。" },
      values: { title, content, tagsString }
    });
  }
};

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - 新規ドキュメント作成" },
    { name: "description", content: "新しいドキュメントを作成する" },
  ];
};

export default function NewDocument() {
  const actionData = useActionData<{
    errors?: Record<string, string>;
    values?: { title: string; content: string; tagsString: string };
  }>();
  const navigate = useNavigate();

  // State for form fields
  const [title, setTitle] = useState(actionData?.values?.title || "");
  const [content, setContent] = useState(actionData?.values?.content || "");
  const [tagsString, setTagsString] = useState(actionData?.values?.tagsString || "");

  return (
    <Layout>
      <div className="new-document">
        <h2>新規ドキュメント作成</h2>

        {actionData?.errors?.form && (
          <div className="alert alert-danger" role="alert">
            {actionData.errors.form}
          </div>
        )}

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
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/documents")}>
                  キャンセル
                </button>
                <button type="submit" className="btn btn-primary">
                  保存
                </button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
