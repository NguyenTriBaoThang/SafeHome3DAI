"use client";
import { useState } from "react";
export default function SignInPage() {
  const [register, setRegister] = useState(false), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div className="min-h-screen grid place-items-center p-5 bg-slate-50"><form className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-sm space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, consent }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      // Never reuse another account's locally saved scenarios on this browser.
      for (const key of Object.keys(localStorage)) if (key.startsWith("safehome:")) localStorage.removeItem(key);
      localStorage.setItem("safehome:auth-change", crypto.randomUUID());
      window.location.assign("/ai-vision");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể kết nối."); } finally { setBusy(false); }
  }}>
    <h1 className="text-2xl font-bold text-teal-800">SafeHome 3D AI</h1>
    <p className="text-sm text-slate-600">{register ? "Tạo tài khoản cho gia đình. Dữ liệu được lưu riêng với các tài khoản khác." : "Đăng nhập để mở hồ sơ gia đình của bạn."}</p>
    <label className="block text-sm">Email<input required type="email" autoComplete="username" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full border rounded-lg p-3" /></label>
    <label className="block text-sm">Mật khẩu<input required type="password" minLength={register ? 12 : 1} maxLength={256} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border rounded-lg p-3" /></label>
    {register && <label className="flex gap-2 text-sm"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Tôi đồng ý lưu hồ sơ gia đình; tôi sẽ chỉ tải ảnh có sự đồng ý của người liên quan. Ảnh gửi Gemini khi chọn provider Gemini.</label>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <button disabled={busy} className="w-full rounded-lg bg-teal-700 text-white p-3 disabled:opacity-50">{busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}</button>
    <button type="button" onClick={() => { setRegister(!register); setError(""); }} className="w-full text-sm text-teal-700">{register ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}</button>
  </form></div>;
}
