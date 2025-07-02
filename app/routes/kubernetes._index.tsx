import type { MetaFunction } from "@remix-run/node";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - Kubernetes設定" },
    { name: "description", content: "クラスタ設定やデフォルトイメージ、Namespaceなどの管理" },
  ];
};

export default function Kubernetes() {
  return (
    <Layout>
      <div className="kubernetes">
        <h2>Kubernetes設定</h2>
        
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title">クラスタ設定</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="clusterUrl" className="form-label">Kubernetes API URL</label>
                  <input type="text" className="form-control" id="clusterUrl" defaultValue="https://kubernetes.default.svc" />
                </div>
                <div className="mb-3">
                  <label htmlFor="namespace" className="form-label">デフォルトNamespace</label>
                  <input type="text" className="form-control" id="namespace" defaultValue="keruta" />
                </div>
                <div className="mb-3">
                  <label htmlFor="serviceAccount" className="form-label">ServiceAccount</label>
                  <input type="text" className="form-control" id="serviceAccount" defaultValue="keruta-service-account" />
                </div>
                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="inCluster" defaultChecked />
                  <label className="form-check-label" htmlFor="inCluster">クラスター内で実行</label>
                </div>
                <button className="btn btn-primary">設定を保存</button>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">リソース制限</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="cpuLimit" className="form-label">CPU制限 (デフォルト)</label>
                  <input type="text" className="form-control" id="cpuLimit" defaultValue="1000m" />
                </div>
                <div className="mb-3">
                  <label htmlFor="memoryLimit" className="form-label">メモリ制限 (デフォルト)</label>
                  <input type="text" className="form-control" id="memoryLimit" defaultValue="1Gi" />
                </div>
                <div className="mb-3">
                  <label htmlFor="cpuRequest" className="form-label">CPU要求 (デフォルト)</label>
                  <input type="text" className="form-control" id="cpuRequest" defaultValue="500m" />
                </div>
                <div className="mb-3">
                  <label htmlFor="memoryRequest" className="form-label">メモリ要求 (デフォルト)</label>
                  <input type="text" className="form-control" id="memoryRequest" defaultValue="512Mi" />
                </div>
                <button className="btn btn-primary">設定を保存</button>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title">デフォルトイメージ設定</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="baseImage" className="form-label">ベースイメージ</label>
                  <input type="text" className="form-control" id="baseImage" defaultValue="ubuntu:20.04" />
                </div>
                <div className="mb-3">
                  <label htmlFor="nodeImage" className="form-label">Node.jsイメージ</label>
                  <input type="text" className="form-control" id="nodeImage" defaultValue="node:16-alpine" />
                </div>
                <div className="mb-3">
                  <label htmlFor="pythonImage" className="form-label">Pythonイメージ</label>
                  <input type="text" className="form-control" id="pythonImage" defaultValue="python:3.9-slim" />
                </div>
                <div className="mb-3">
                  <label htmlFor="javaImage" className="form-label">Javaイメージ</label>
                  <input type="text" className="form-control" id="javaImage" defaultValue="openjdk:11-jdk-slim" />
                </div>
                <button className="btn btn-primary">設定を保存</button>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Podログ設定</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="logRetention" className="form-label">ログ保持期間 (日)</label>
                  <input type="number" className="form-control" id="logRetention" defaultValue="30" />
                </div>
                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="streamLogs" defaultChecked />
                  <label className="form-check-label" htmlFor="streamLogs">リアルタイムログストリーミングを有効化</label>
                </div>
                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="compressLogs" defaultChecked />
                  <label className="form-check-label" htmlFor="compressLogs">古いログを圧縮</label>
                </div>
                <button className="btn btn-primary">設定を保存</button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">マニフェスト管理</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="manifestTemplate" className="form-label">デフォルトマニフェストテンプレート</label>
              <textarea 
                className="form-control" 
                id="manifestTemplate" 
                rows={10}
                defaultValue={`apiVersion: batch/v1
kind: Job
metadata:
  name: ${'{task-id}'}
  namespace: keruta
spec:
  template:
    spec:
      containers:
      - name: ${'{task-name}'}
        image: ${'{image}'}
        resources:
          limits:
            cpu: ${'{cpu-limit}'}
            memory: ${'{memory-limit}'}
          requests:
            cpu: ${'{cpu-request}'}
            memory: ${'{memory-request}'}
        env:
        - name: KERUTA_TASK_ID
          value: "${'{task-id}'}"
      restartPolicy: Never
  backoffLimit: 0`}
              ></textarea>
            </div>
            <button className="btn btn-primary me-2">テンプレートを保存</button>
            <button className="btn btn-outline-secondary">デフォルトに戻す</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}