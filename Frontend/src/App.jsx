import { useEffect, useMemo, useState } from "react";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const emptyBook = {
  bookId: "", title: "", author: "", category: "", publisher: "",
  publishYear: new Date().getFullYear(), isbn: "", quantity: 0, description: "",
};

async function callApi(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Lỗi HTTP ${response.status}`);
  return data;
}

export default function App() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyBook);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const suffix = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const data = await callApi(`/api/books${suffix}`, { signal: controller.signal });
        if (!controller.signal.aborted) setBooks(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(`Không tải được dữ liệu: ${err.message}. Kiểm tra backend ở ${API}`);
          setBooks([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search.trim() ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, revision]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const categories = useMemo(
    () => ["Tất cả", ...new Set(books.map((book) => book.category).filter(Boolean))],
    [books]
  );
  const visible = useMemo(
    () => category === "Tất cả" ? books : books.filter((book) => book.category === category),
    [books, category]
  );
  const copies = visible.reduce((sum, book) => sum + (Number(book.quantity) || 0), 0);
  const showNotice = (message, success = true) => setNotice({ message, success });
  const reload = () => setRevision((value) => value + 1);

  function openForm(book = null) {
    setForm(book ? { ...book } : { ...emptyBook });
    setFormError("");
    setModal({ type: book ? "edit" : "add", book });
  }

  async function handleSave(event) {
    event.preventDefault();
    const required = ["bookId", "title", "author", "category", "publisher", "isbn"];
    if (required.some((key) => !String(form[key] ?? "").trim())) {
      setFormError("Vui lòng nhập đầy đủ các trường bắt buộc.");
      return;
    }
    const quantity = Number(form.quantity);
    const publishYear = Number(form.publishYear);
    if (!Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(publishYear) || publishYear < 0 || publishYear > 2100) {
      setFormError("Số lượng phải là số nguyên không âm; năm xuất bản phải là số nguyên từ 0 đến 2100.");
      return;
    }
    const payload = {
      bookId: form.bookId.trim(), title: form.title.trim(), author: form.author.trim(),
      category: form.category.trim(), publisher: form.publisher.trim(),
      publishYear, isbn: form.isbn.trim(), quantity,
      description: form.description.trim(),
    };
    setSaving(true);
    setFormError("");
    try {
      const editing = modal.type === "edit";
      await callApi(editing ? `/api/books/${modal.book._id}` : "/api/books", {
        method: editing ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      setModal(null);
      setCategory("Tất cả");
      reload();
      showNotice(editing ? "Cập nhật sách thành công!" : "Thêm sách thành công!");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(book) {
    if (!window.confirm(`Xóa sách "${book.title}" (${book.bookId})? Thao tác này không thể hoàn tác.`)) return;
    try {
      await callApi(`/api/books/${book._id}`, { method: "DELETE" });
      setModal(null);
      reload();
      showNotice("Xóa sách thành công!");
    } catch (err) {
      showNotice(`Không xóa được sách: ${err.message}`, false);
    }
  }

  const input = (name, label, type = "text", required = true) => (
    <label className="field" key={name}>
      <span>{label}{required && <b> *</b>}</span>
      <input
        name={name} type={type} required={required} value={form[name] ?? ""}
        min={type === "number" ? 0 : undefined}
        max={name === "publishYear" ? 2100 : undefined}
        step={type === "number" ? 1 : undefined}
        onChange={(event) => setForm((previous) => ({ ...previous, [name]: event.target.value }))}
        placeholder={`Nhập ${label.toLowerCase()}`}
      />
    </label>
  );

  return (
    <div className="bkapp" data-theme={theme}>
      <style>{styles}</style>
      <aside className="sidebar">
        <div className="brand"><div className="brand-logo">📚</div><div><strong>BookCloud</strong><small>LIBRARY MANAGEMENT</small></div></div>
        <div className="side-label">KHÔNG GIAN LÀM VIỆC</div>
        <div className="side-active"><span>▦</span> Quản lý sách <span className="side-pill">{books.length}</span></div>
        <div className="side-label side-label-2">HỆ THỐNG</div>
        <div className="side-static">☁️ MongoDB Atlas</div>
        <div className="side-static">⚡ React + Express</div>
        <div className="side-bottom"><div className="avatar">NH</div><div><b>Nguyễn Huy Hoàng</b><small>MSSV: 234948</small></div></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">Workspace <span>/</span> <b>Quản lý sách</b></div>
          <div className="top-actions">
            <span className="online"><i /> {error ? "Chưa kết nối" : "Hệ thống quản lý sách"}</span>
            <button className="square-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Đổi giao diện sáng/tối">{theme === "dark" ? "☀️" : "🌙"}</button>
          </div>
        </header>

        <div className="content">
          <div className="hero">
            <div><div className="eyebrow">☁️ CLOUD BOOK MANAGEMENT</div><h1>Thư viện của bạn<span>.</span></h1>
              <p>Quản lý kho sách thông minh, đồng bộ dữ liệu với MongoDB Atlas.</p></div>
            <button className="primary" onClick={() => openForm()}>＋ Thêm sách mới</button>
          </div>

          <div className="stats">
            <div className="stat"><span className="stat-icon purple">📖</span><div><small>SÁCH ĐANG HIỂN THỊ</small><strong>{visible.length}</strong><span>Đầu sách trong danh sách</span></div></div>
            <div className="stat"><span className="stat-icon blue">🗂️</span><div><small>TỔNG SỐ BẢN</small><strong>{copies}</strong><span>Cuốn sách trong kho</span></div></div>
            <div className="stat"><span className="stat-icon green">✨</span><div><small>THỂ LOẠI</small><strong>{new Set(visible.map((book) => book.category)).size}</strong><span>Nhóm sách hiện có</span></div></div>
          </div>

          <section className="library">
            <div className="library-head"><div><h2>Danh mục sách</h2><p>Tra cứu và quản lý thông tin toàn bộ sách của bạn</p></div><button className="outline-btn" onClick={reload}>↻ Làm mới</button></div>
            <div className="tools">
              <div className="search-box"><span>⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setCategory("Tất cả"); }} placeholder="Tìm theo tên sách, tác giả, thể loại..." aria-label="Tìm kiếm sách" />{search && <button onClick={() => setSearch("")}>×</button>}</div>
              <span className="result-count">{visible.length} kết quả</span>
            </div>
            <div className="filters">{categories.map((name) => <button key={name} className={name === category ? "filter active" : "filter"} onClick={() => setCategory(name)}>{name}</button>)}</div>
            {error && <div className="error-banner">⚠️ {error} <button onClick={reload}>Thử lại</button></div>}
            {loading ? <div className="empty"><div className="spinner" /><b>Đang tải dữ liệu sách...</b><span>Đang kết nối đến backend</span></div>
            : visible.length === 0 ? <div className="empty"><span className="empty-icon">📚</span><b>Chưa tìm thấy sách</b><span>Hãy thử từ khóa khác hoặc thêm sách mới.</span></div>
            : <div className="table-scroll"><table><thead><tr><th>SÁCH</th><th>MÃ SÁCH</th><th>THỂ LOẠI</th><th>NĂM XB</th><th>SỐ LƯỢNG</th><th>THAO TÁC</th></tr></thead><tbody>
              {visible.map((book, index) => <tr key={book._id}>
                <td><div className="book-cell"><div className={`book-cover cover-${index % 4}`}>📘</div><div><strong>{book.title}</strong><small>{book.author}</small></div></div></td>
                <td><code>{book.bookId}</code></td><td><span className="category-chip">{book.category}</span></td><td>{book.publishYear}</td>
                <td><span className={Number(book.quantity) === 0 ? "qty out" : "qty"}>{book.quantity} cuốn</span></td>
                <td><div className="row-actions"><button title="Xem chi tiết" onClick={() => setModal({ type: "detail", book })}>👁</button><button title="Chỉnh sửa" onClick={() => openForm(book)}>✎</button><button title="Xóa sách" className="red-action" onClick={() => handleDelete(book)}>🗑</button></div></td>
              </tr>)}
            </tbody></table></div>}
            <div className="table-footer">Dữ liệu lấy trực tiếp từ <strong>MongoDB Atlas</strong> qua Express API <span>● Đồng bộ theo yêu cầu</span></div>
          </section>
          <footer>© 2026 BookCloud • Đồ án Điện toán đám mây • 234948_NguyenHuyHoang</footer>
        </div>
      </main>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-label={modal.type === "detail" ? "Chi tiết sách" : "Biểu mẫu sách"}>
          <div className="modal-head"><div><small>BOOKCLOUD / THƯ VIỆN</small><h2>{modal.type === "add" ? "Thêm sách mới" : modal.type === "edit" ? "Cập nhật sách" : "Chi tiết sách"}</h2></div><button className="close-btn" onClick={() => setModal(null)} title="Đóng">×</button></div>
          {modal.type === "detail" ? <div className="detail-body"><div className="detail-cover">📖</div><h3>{modal.book.title}</h3><p className="detail-author">Tác giả: {modal.book.author}</p><div className="detail-grid">
            {[ ["Mã sách", modal.book.bookId], ["Thể loại", modal.book.category], ["Nhà xuất bản", modal.book.publisher], ["Năm xuất bản", modal.book.publishYear], ["ISBN", modal.book.isbn], ["Số lượng", `${modal.book.quantity} cuốn`] ].map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}
          </div><div className="description"><small>MÔ TẢ</small><p>{modal.book.description || "Chưa có mô tả."}</p></div><div className="modal-buttons"><button className="outline-btn" onClick={() => setModal(null)}>Đóng</button><button className="primary" onClick={() => openForm(modal.book)}>✎ Chỉnh sửa</button></div></div>
          : <form onSubmit={handleSave} className="book-form"><div className="form-grid">{input("bookId", "Mã sách")}{input("title", "Tên sách")}{input("author", "Tác giả")}{input("category", "Thể loại")}{input("publisher", "Nhà xuất bản")}{input("publishYear", "Năm xuất bản", "number")}{input("isbn", "ISBN")}{input("quantity", "Số lượng", "number")}</div>
            <label className="field"><span>Mô tả sách</span><textarea value={form.description ?? ""} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} rows="3" placeholder="Nhập nội dung giới thiệu về sách..." /></label>
            {formError && <div className="form-error">⚠️ {formError}</div>}
            <div className="modal-buttons"><button type="button" className="outline-btn" onClick={() => setModal(null)}>Hủy bỏ</button><button className="primary" type="submit" disabled={saving}>{saving ? "Đang lưu..." : modal.type === "add" ? "＋ Thêm sách" : "✓ Lưu thay đổi"}</button></div>
          </form>}
        </div>
      </div>}
      {notice && <div className={notice.success ? "toast" : "toast toast-error"}>{notice.success ? "✅" : "⚠️"} {notice.message}<button onClick={() => setNotice(null)}>×</button></div>}
    </div>
  );
}

const styles = `
*{box-sizing:border-box}html,body{margin:0!important;min-width:320px!important}body{display:block!important;min-height:100vh}#root{max-width:none!important;width:100%!important;min-height:100vh;margin:0!important;padding:0!important;text-align:left!important}
.bkapp{--bg:#0b1020;--panel:#141b2d;--line:#263149;--text:#f4f6fd;--muted:#98a4be;--soft:#1b2540;--hover:#253050;min-height:100vh;display:flex;background:var(--bg);color:var(--text);font:14px/1.5 Inter,Segoe UI,Arial,sans-serif;transition:background .2s,color .2s}
.bkapp[data-theme=light]{--bg:#f4f6fc;--panel:#fff;--line:#e5e9f3;--text:#17223b;--muted:#6d7790;--soft:#f1f3fa;--hover:#e9ecf7}
.bkapp button,.bkapp input,.bkapp textarea{font:inherit}.bkapp button{cursor:pointer;transition:.16s ease;background:none;color:inherit;border:0}.bkapp button:disabled{cursor:wait;opacity:.6}.bkapp button:hover:not(:disabled){filter:brightness(1.1)}.bkapp input,.bkapp textarea{outline:0}
.sidebar{background:var(--panel);border-right:1px solid var(--line);width:247px;flex:0 0 247px;display:flex;flex-direction:column;min-height:100vh;padding:28px 17px}.brand{display:flex;align-items:center;gap:12px;padding:4px 10px 36px}.brand-logo{width:43px;height:43px;border-radius:13px;background:linear-gradient(145deg,#7864ff,#4331c2);display:grid;place-items:center;font-size:24px}.brand strong{font-size:21px;letter-spacing:-.7px}.brand small{display:block;color:var(--muted);font-size:9px;letter-spacing:1.3px;font-weight:700}.side-label{color:var(--muted);font-size:10px;font-weight:800;letter-spacing:1.25px;padding:0 14px;margin:0 0 13px}.side-label-2{margin-top:35px}.side-active,.side-static{padding:12px 15px;border-radius:11px;display:flex;align-items:center;gap:12px}.side-active{background:#6758e72b;color:#aea2ff;font-weight:700;border:1px solid #7661ec45}.side-active>span:first-child{font-size:21px}.side-pill{margin-left:auto;background:#6758e749;padding:1px 8px;border-radius:7px;font-size:11px}.side-static{color:var(--muted);font-size:13px}.side-bottom{margin-top:auto;border-top:1px solid var(--line);padding:24px 6px 5px;display:flex;align-items:center;gap:10px}.avatar{width:39px;height:39px;background:linear-gradient(135deg,#6853e8,#b063e1);display:grid;place-items:center;border-radius:50%;font-weight:800;color:white}.side-bottom b{display:block;font-size:12px}.side-bottom small{display:block;color:var(--muted);font-size:11px}
.main{flex:1;min-width:0}.topbar{height:76px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 38px}.crumb{color:var(--muted);font-size:13px}.crumb span{margin:0 10px;color:#667086}.crumb b{color:var(--text)}.top-actions{display:flex;align-items:center;gap:22px}.online{color:var(--muted);font-size:12px}.online i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#30cc91;margin-right:6px}.square-btn{height:37px;width:40px;border:1px solid var(--line)!important;border-radius:10px;font-size:17px!important}
.content{max-width:1500px;margin:auto;padding:36px 39px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:29px}.eyebrow{color:#a595ff;font-size:11px;font-weight:800;letter-spacing:1.45px}.hero h1{color:var(--text)!important;font-size:36px!important;line-height:1.2!important;margin:10px 0!important;letter-spacing:-1.5px}.hero h1 span{color:#8b7bff}.hero p,.library-head p{color:var(--muted);margin:0}.primary{color:#fff!important;background:linear-gradient(120deg,#7667f9,#5946d5)!important;padding:12px 19px!important;border-radius:11px!important;font-weight:750!important;box-shadow:0 7px 20px #5946d52e;white-space:nowrap}.primary:hover{transform:translateY(-1px)}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-bottom:27px}.stat{display:flex;align-items:center;gap:17px;background:var(--panel);border:1px solid var(--line);border-radius:15px;padding:22px}.stat-icon{font-size:25px;flex:0 0 54px;width:54px;height:54px;display:grid;place-items:center;border-radius:14px}.purple{background:#7659f729}.blue{background:#368ef32a}.green{background:#32c99629}.stat small,.stat strong,.stat span:last-child{display:block}.stat small{font-size:10px;letter-spacing:1px;color:var(--muted);font-weight:800}.stat strong{font-size:27px;line-height:1.2;margin:5px 0;color:var(--text)}.stat span:last-child{font-size:11px;color:var(--muted)}
.library{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}.library-head{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:25px 25px 16px}.library h2{margin:0 0 5px;font-size:20px;letter-spacing:-.4px;color:var(--text)}.library-head p{font-size:12px}.outline-btn{border:1px solid var(--line)!important;border-radius:10px!important;padding:10px 15px!important;font-weight:650!important;white-space:nowrap}.outline-btn:hover{background:var(--hover)!important}.tools{padding:7px 25px 15px;display:flex;justify-content:space-between;align-items:center;gap:16px}.search-box{display:flex;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:10px;max-width:480px;width:100%;padding:0 13px}.search-box>span{font-size:26px;color:var(--muted)}.search-box input{width:100%;padding:11px 10px;background:transparent;color:var(--text);border:0!important;font-size:13px}.search-box input::placeholder{color:var(--muted)}.search-box button{font-size:21px;color:var(--muted)}.result-count{font-size:12px;color:var(--muted);white-space:nowrap}.filters{padding:0 25px 20px;display:flex;gap:8px;overflow-x:auto}.filter{border:1px solid var(--line)!important;padding:7px 13px!important;border-radius:8px!important;font-size:12px!important;white-space:nowrap;color:var(--muted)!important}.filter.active{border-color:#7c66f9!important;background:#7565ff28!important;color:#ac9cff!important;font-weight:750!important}
.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:810px}th{background:var(--soft);color:var(--muted);text-align:left;font-size:10px;letter-spacing:.7px;padding:13px 19px;font-weight:800}td{padding:16px 19px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}tr:hover td{background:var(--hover)}.book-cell{display:flex;align-items:center;gap:13px;min-width:220px}.book-cover{height:43px;width:37px;flex-shrink:0;border-radius:6px;background:linear-gradient(140deg,#544cc2,#8767d6);display:grid;place-items:center;font-size:21px}.cover-1{background:linear-gradient(140deg,#2b80b8,#3ec7cb)}.cover-2{background:linear-gradient(140deg,#bf686e,#d98a6f)}.cover-3{background:linear-gradient(140deg,#368d78,#67c1a2)}.book-cell strong{display:block;font-size:12px;color:var(--text);font-weight:750}.book-cell small{color:var(--muted);font-size:11px}.bkapp code{font-size:12px;font-family:Consolas,monospace;background:var(--soft);color:#ab9dff;padding:5px 8px;border-radius:6px}.category-chip{display:inline-block;border:1px solid var(--line);background:var(--soft);border-radius:7px;padding:5px 9px;color:var(--text);white-space:nowrap}.qty{color:#34d39e;background:#2bb88a20;padding:5px 9px;border-radius:7px;white-space:nowrap;font-weight:700}.qty.out{color:#ed9b7e;background:#d7664623}.row-actions{display:flex;gap:5px}.row-actions button{border:1px solid var(--line)!important;border-radius:7px!important;height:32px;width:32px;font-size:17px!important}.row-actions button:hover{background:var(--soft)!important}.red-action{color:#f18a99!important}.table-footer{padding:18px 25px;border-top:1px solid var(--line);font-size:11px;color:var(--muted);display:flex;justify-content:space-between;gap:15px}.table-footer strong{color:var(--text)}.table-footer span{color:#2dc897}.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:68px 20px;color:var(--muted);gap:8px}.empty b{color:var(--text);font-size:15px}.empty-icon{font-size:38px}.spinner{width:29px;height:29px;border:3px solid var(--line);border-top-color:#8e7fff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error-banner{margin:0 25px 15px;padding:12px;background:#cb4e5c1d;color:#f09c9d;border:1px solid #dc5b6640;border-radius:9px;font-size:12px}.error-banner button{text-decoration:underline;margin-left:8px}footer{text-align:center;color:var(--muted);font-size:11px;margin-top:25px}
.modal-backdrop{position:fixed;inset:0;background:#030716bf;backdrop-filter:blur(5px);z-index:20;display:flex;align-items:center;justify-content:center;padding:15px}.modal{width:min(640px,100%);max-height:92vh;overflow-y:auto;border-radius:18px;background:var(--panel);color:var(--text);border:1px solid var(--line);box-shadow:0 24px 100px #05071780}.modal-head{display:flex;justify-content:space-between;align-items:flex-start;padding:24px 27px;border-bottom:1px solid var(--line)}.modal-head small{color:#9e8cff;font-size:10px;font-weight:800;letter-spacing:1.4px}.modal-head h2{font-size:23px;margin:5px 0 0}.close-btn{font-size:26px!important;color:var(--muted)!important;line-height:1}.book-form,.detail-body{padding:24px 27px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{display:flex;flex-direction:column;gap:7px;margin-bottom:16px}.field>span{font-weight:650;font-size:12px}.field b{color:#ec7c93}.field input,.field textarea{width:100%;border:1px solid var(--line)!important;background:var(--bg)!important;border-radius:9px!important;padding:11px 12px!important;color:var(--text)!important;resize:vertical;font-size:13px!important}.field input:focus,.field textarea:focus{border-color:#8977ff!important}.field input::placeholder,.field textarea::placeholder{color:var(--muted)}.form-error{background:#f15b641d;border:1px solid #f15b6440;padding:11px;border-radius:9px;color:#ef989d;margin-bottom:16px;font-size:12px}.modal-buttons{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}.detail-cover{height:70px;width:70px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#7160e8,#aa7be9);font-size:40px}.detail-body h3{font-size:22px;margin:17px 0 4px}.detail-author{color:var(--muted);margin:0 0 22px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:21px;background:var(--bg);border-radius:12px}.detail-grid small,.description small{display:block;color:var(--muted);font-size:10px;letter-spacing:.5px;text-transform:uppercase}.detail-grid b{font-size:13px;display:block;margin-top:5px}.description{padding:20px 0}.description p{color:var(--text);margin:9px 0 4px}.toast{position:fixed;z-index:30;right:20px;bottom:20px;background:#1c644c;color:white;border:1px solid #3b956d;border-radius:12px;box-shadow:0 10px 38px #0004;padding:13px 15px;display:flex;gap:15px;align-items:center}.toast-error{background:#8c353f;border-color:#b54b55}.toast button{font-size:20px;color:white}
@media(max-width:1100px){.sidebar{width:205px;flex-basis:205px}.content{padding:27px 24px}.topbar{padding:0 24px}.stat{padding:16px;gap:10px}.stat-icon{width:43px;flex-basis:43px;height:43px}}
@media(max-width:800px){.sidebar{display:none}.topbar{height:60px}.content{padding:25px 16px}.stats{gap:10px}.stat{padding:14px}.stat-icon{display:none}.hero h1{font-size:29px!important}.hero{align-items:flex-start}.top-actions .online{display:none}}
@media(max-width:560px){.hero{display:block}.hero>.primary{margin-top:18px}.stats{grid-template-columns:1fr 1fr}.stats .stat:last-child{grid-column:span 2}.stat-icon{display:grid;width:40px;flex-basis:40px;height:40px}.library-head{padding:18px 15px}.tools{padding:7px 15px 12px}.filters{padding:0 15px 15px}.result-count{display:none}.library-head p{max-width:210px}.table-footer{display:block;padding:14px 16px}.table-footer span{display:block;margin-top:4px}.form-grid,.detail-grid{grid-template-columns:1fr}.modal-head,.book-form,.detail-body{padding:20px}}
`;
