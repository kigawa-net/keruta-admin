import { Link } from "@remix-run/react";
import { ReactNode, useState } from "react";
import { RealtimeProvider } from "~/contexts/RealtimeContext";
import RealtimeIndicator from "~/components/RealtimeIndicator";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <RealtimeProvider>
      <div className="container-fluid">
        <div className="row">
        {/* Mobile Header */}
        <div className="d-md-none bg-primary text-white p-3 mobile-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">keruta管理パネル</h5>
            <button 
              className="btn btn-outline-light d-md-none"
              type="button"
              onClick={toggleSidebar}
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              aria-label="メニューを開く"
            >
              <span className="navbar-toggler-icon">☰</span>
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className={`col-md-3 col-lg-2 bg-light sidebar ${sidebarOpen ? 'd-block' : 'd-none'} d-md-block`}>
          <div className="position-sticky pt-3">
            <h5 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted d-none d-md-flex">
              <span>keruta管理パネル</span>
            </h5>
            <ul className="nav flex-column">
              <li className="nav-item">
                <Link to="/" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  ダッシュボード
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/sessions" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  セッション管理
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/tasks" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  タスク管理
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/logs" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  セッションログ
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/documents" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  ドキュメント管理
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/repositories" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  リポジトリ管理
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/workspaces" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  ワークスペース
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/templates" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  テンプレート管理
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/kubernetes" className="nav-link" onClick={() => setSidebarOpen(false)}>
                  Kubernetes設定
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none"
            style={{ zIndex: 1040 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-2 px-md-4">
          <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
            <div>
              <h1 className="h2 d-none d-md-block">keruta管理パネル</h1>
              <h1 className="h4 d-md-none">ダッシュボード</h1>
            </div>
            <RealtimeIndicator compact={true} />
          </div>
          {children}
        </main>
      </div>
    </div>
    </RealtimeProvider>
  );
}