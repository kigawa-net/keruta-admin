import React from 'react';
import { Link } from '@remix-run/react';

/**
 * Navigation Bar Component
 *
 * This component displays the application navigation bar.
 */
export const Navbar: React.FC = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">Keruta Admin</Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/tasks">タスク</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/agents">エージェント</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/repositories">リポジトリ</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/documents">ドキュメント</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/kubernetes">Kubernetes</Link>
            </li>
          </ul>

          {/* Auth buttons removed */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
