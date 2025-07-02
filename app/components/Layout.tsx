import { Link } from "@remix-run/react";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="container-fluid">
      <div className="row">
        {/* Sidebar Navigation */}
        <div className="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse">
          <div className="position-sticky pt-3">
            <h5 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
              <span>keruta管理パネル</span>
            </h5>
            <ul className="nav flex-column">
              <li className="nav-item">
                <Link to="/" className="nav-link">
                  ダッシュボード
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/tasks" className="nav-link">
                  タスク管理
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/documents" className="nav-link">
                  ドキュメント管理
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/repositories" className="nav-link">
                  リポジトリ管理
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/kubernetes" className="nav-link">
                  Kubernetes設定
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/agents" className="nav-link">
                  エージェント管理
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
            <h1 className="h2">keruta管理パネル</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}