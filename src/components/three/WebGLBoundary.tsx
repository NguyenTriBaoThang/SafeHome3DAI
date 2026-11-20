"use client";
import React from "react";

export function WebGLFallback({ retry }: { retry?: () => void }) {
  return <div role="status" className="webgl-fallback absolute inset-0 flex flex-col items-center justify-center gap-4 bg-stone-100 p-8 text-center text-slate-600">
    <span className="webgl-fallback-symbol" aria-hidden="true">⌂</span>
    <h3>Tiếp tục khám phá bằng dữ liệu</h3>
    <p>Trình duyệt chưa thể hiển thị WebGL. Danh sách phòng, đánh giá và mô phỏng vẫn dùng được.</p>
    {retry && <button type="button" onClick={retry}>Thử tải lại mô hình</button>}
    <a href="/risk-assessment">Mở bảng đánh giá nguy cơ</a>
  </div>;
}

export class WebGLBoundary extends React.Component<{ children: React.ReactNode; resetKey?: number; onFailure?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure?.(); }
  componentDidUpdate(previous: Readonly<{ children: React.ReactNode; resetKey?: number; onFailure?: () => void }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() { return this.state.failed ? <WebGLFallback retry={() => this.setState({ failed: false })} /> : this.props.children; }
}
