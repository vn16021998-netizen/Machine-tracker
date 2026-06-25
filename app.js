/* ═══════════════════════════════════════════════════════════════
   MACHINE TRACKER — app.js (Advanced)
   Stack: Web Speech API + Gemini 1.5 Flash + Google Apps Script
═══════════════════════════════════════════════════════════════ */

// ─── DANH SÁCH MÁY & MÃ ───────────────────────────────────────
const MACHINES = [
  { name: 'Máy đóng gói 1', code: 'BBC101', type: 'Đóng gói' },
  { name: 'Máy ghép mí', code: 'MX02', type: 'Ghép mí' },
  { name: 'Máy đóng thùng', code: 'PKG3', type: 'Đóng thùng' },
  { name: 'Máy cấp nước', code: 'WTR01', type: 'Hỗ trợ' },
];

// ─── MÃ LỖI THEO LOẠI MÁY ─────────────────────────────────────
const ERROR_CODES_BY_MACHINE = {
  'BBC101': [
    { code: 'E001', name: 'Móp bát / hộp', cat: 'Chất lượng' },
    { code: 'E002', name: 'Lỗi tem nhãn', cat: 'Chất lượng' },
    { code: 'E003', name: 'Thiếu trọng lượng', cat: 'Chất lượng' },
    { code: 'E004', name: 'Kẹt băng tải', cat: 'Cơ khí' },
    { code: 'E006', name: 'Thay khuôn / dụng cụ', cat: 'Cơ khí' },
    { code: 'E010', name: 'Thiếu nguyên liệu', cat: 'Vật tư' },
    { code: 'E011', name: 'Bảo trì định kỳ (PM)', cat: 'Bảo trì' },
    { code: 'E012', name: 'Vệ sinh máy', cat: 'Bảo trì' },
    { code: 'E015', name: 'Sự cố khác', cat: 'Khác' },
  ],
  'MX02': [
    { code: 'E002', name: 'Lỗi tem nhãn', cat: 'Chất lượng' },
    { code: 'E005', name: 'Lỗi đầu hàn / ghép mí', cat: 'Cơ khí' },
    { code: 'E004', name: 'Kẹt băng tải', cat: 'Cơ khí' },
    { code: 'E006', name: 'Thay khuôn / dụng cụ', cat: 'Cơ khí' },
    { code: 'E007', name: 'Lỗi cảm biến', cat: 'Điện - Điều khiển' },
    { code: 'E008', name: 'Lỗi nguồn điện', cat: 'Điện - Điều khiển' },
    { code: 'E009', name: 'Lỗi phần mềm / màn hình', cat: 'Điện - Điều khiển' },
    { code: 'E011', name: 'Bảo trì định kỳ (PM)', cat: 'Bảo trì' },
    { code: 'E015', name: 'Sự cố khác', cat: 'Khác' },
  ],
  'PKG3': [
    { code: 'E001', name: 'Móp bát / hộp', cat: 'Chất lượng' },
    { code: 'E003', name: 'Thiếu trọng lượng', cat: 'Chất lượng' },
    { code: 'E004', name: 'Kẹt băng tải', cat: 'Cơ khí' },
    { code: 'E006', name: 'Thay khuôn / dụng cụ', cat: 'Cơ khí' },
    { code: 'E007', name: 'Lỗi cảm biến', cat: 'Điện - Điều khiển' },
    { code: 'E010', name: 'Thiếu nguyên liệu', cat: 'Vật tư' },
    { code: 'E011', name: 'Bảo trì định kỳ (PM)', cat: 'Bảo trì' },
    { code: 'E015', name: 'Sự cố khác', cat: 'Khác' },
  ],
  'WTR01': [
    { code: 'E004', name: 'Kẹt / tắc ống', cat: 'Cơ khí' },
    { code: 'E007', name: 'Lỗi cảm biến', cat: 'Điện - Điều khiển' },
    { code: 'E008', name: 'Lỗi nguồn điện', cat: 'Điện - Điều khiển' },
    { code: 'E010', name: 'Thiếu nguyên liệu', cat: 'Vật tư' },
    { code: 'E011', name: 'Bảo trì định kỳ (PM)', cat: 'Bảo trì' },
    { code: 'E015', name: 'Sự cố khác', cat: 'Khác' },
  ],
};

// ─── STATE ───────────────────────────────────────────────────
let downtimeRowCount = 0;
let currentErrorTargetRow = null;
let recognition = null;
let isRecording = false;
let config = {};
let records = [];

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setDefaultDate();
  loadRecordsFromStorage();
  populateMachineDropdown();
  populateErrorList();
  loadDashboard();

  // Set history date to today
  document.getElementById('histDate').value = todayStr();
  loadHistory();

  // Dashboard date
  document.getElementById('dashDate').textContent =
    new Date().toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // PWA install
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

function setDefaultDate() {
  document.getElementById('f_ngay').value = todayStr();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── POPULATE MACHINE DROPDOWN ─────────────────────────────────
function populateMachineDropdown() {
  const select = document.getElementById('f_ten_may');
  select.innerHTML = '<option value="">— Chọn máy —</option>';
  MACHINES.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.code; // Lưu mã máy vào value
    opt.textContent = `${m.name} (${m.code})`;
    select.appendChild(opt);
  });
}

// ─── KHI CHỌN BẤT KỲ MÁY NÀO ──────────────────────────────────
function onMachineNameChange() {
  const maMAy = document.getElementById('f_ten_may').value;
  const tenMay = document.querySelector('#f_ten_may option:checked').textContent;

  // Tự động điền mã máy
  if (maMAy) {
    document.getElementById('f_ma_may').value = maMAy;
    // Cập nhật danh sách lỗi cho máy này
    populateErrorList(maMAy);
  } else {
    document.getElementById('f_ma_may').value = '';
    populateErrorList();
  }
}

// ─── POPULATE DANH SÁCH LỖI (LỌC THEO MÁY) ────────────────────
function populateErrorList(maMay = null) {
  let errors = [];

  if (maMay && ERROR_CODES_BY_MACHINE[maMay]) {
    errors = ERROR_CODES_BY_MACHINE[maMay];
  } else {
    // Nếu chưa chọn máy, hiển thị tất cả lỗi
    Object.values(ERROR_CODES_BY_MACHINE).forEach(list => {
      list.forEach(e => {
        if (!errors.find(x => x.code === e.code)) errors.push(e);
      });
    });
  }

  renderErrorList(errors);
}

// ─── TAB SWITCH ──────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('tab-btn-' + name).classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'history') loadHistory();
}

// ─── CONFIG / SETTINGS ───────────────────────────────────────
function loadConfig() {
  try {
    config = JSON.parse(localStorage.getItem('mt_config') || '{}');
    if (config.geminiKey) document.getElementById('cfg_gemini').value = config.geminiKey;
    if (config.scriptUrl) document.getElementById('cfg_script').value = config.scriptUrl;
    if (config.factory)   document.getElementById('cfg_factory').value = config.factory;
  } catch(e) { config = {}; }
}

function saveSettings() {
  config.geminiKey = document.getElementById('cfg_gemini').value.trim();
  config.scriptUrl = document.getElementById('cfg_script').value.trim();
  config.factory   = document.getElementById('cfg_factory').value.trim();
  localStorage.setItem('mt_config', JSON.stringify(config));
  document.getElementById('cfgStatus').innerHTML =
    '<span style="color:#2E7D32">✓ Đã lưu cài đặt</span>';
  setTimeout(closeSettings, 1200);
  toast('Đã lưu cài đặt');
}

function openSettings() {
  document.getElementById('modalSettings').classList.add('open');
  document.getElementById('cfgStatus').textContent = '';
}
function closeSettings(e) {
  if (e && e.target !== document.getElementById('modalSettings')) return;
  document.getElementById('modalSettings').classList.remove('open');
}

// ─── VOICE RECOGNITION ───────────────────────────────────────
function toggleVoice() {
  if (isRecording) {
    stopVoice();
  } else {
    startVoice();
  }
}

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast('Trình duyệt không hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'vi-VN';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';

  recognition.onstart = () => {
    isRecording = true;
    document.getElementById('micBtn').classList.add('recording');
    document.getElementById('voiceHint').textContent = '🔴 Đang ghi âm... Nói thông tin vận hành';
    document.getElementById('transcriptBox').style.display = 'none';
  };

  recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        finalTranscript += e.results[i][0].transcript + ' ';
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    const display = finalTranscript + interim;
    if (display.trim()) {
      document.getElementById('transcriptBox').style.display = 'block';
      document.getElementById('transcriptText').textContent = display;
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      toast('Cần cấp quyền microphone trong trình duyệt');
    } else {
      toast('Lỗi nhận dạng: ' + e.error);
    }
    stopVoice();
  };

  recognition.onend = () => {
    if (isRecording) recognition.start();
  };

  recognition.start();
}

function stopVoice() {
  isRecording = false;
  if (recognition) { recognition.stop(); recognition = null; }
  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('voiceHint').textContent = 'Nhấn 🎤 và nói thông tin vận hành bằng tiếng Việt';

  const text = document.getElementById('transcriptText').textContent.trim();
  if (text) {
    document.getElementById('transcriptBox').style.display = 'block';
    document.getElementById('aiBtn').style.display = '';
  }
}

function clearTranscript() {
  document.getElementById('transcriptText').textContent = '';
  document.getElementById('transcriptBox').style.display = 'none';
  document.getElementById('aiStatus').textContent = '';
}

// ─── AI / GEMINI PROCESSING ───────────────────────────────────
async function processWithAI() {
  const text = document.getElementById('transcriptText').textContent.trim();
  if (!text) return;

  if (!config.geminiKey) {
    toast('Chưa cài Gemini API Key. Vào ⚙️ Cài đặt để thêm.');
    openSettings();
    return;
  }

  const aiBtn = document.getElementById('aiBtn');
  const aiStatus = document.getElementById('aiStatus');
  aiBtn.disabled = true;
  aiBtn.textContent = '⏳ Đang phân tích...';
  aiStatus.textContent = '';

  const machineList = MACHINES.map(m => m.code + ': ' + m.name).join(', ');

  const prompt = `Bạn là AI trợ lý nhà máy. Phân tích đoạn text tiếng Việt sau đây và trích xuất thông tin vào JSON.

Text: "${text}"

Danh sách mã máy hợp lệ: ${machineList}

Trả về JSON với định dạng chính xác sau (bỏ trống nếu không có thông tin, KHÔNG bịa đặt):
{
  "ten_may": "",
  "ma_may": "",
  "ngay": "",
  "ca": "",
  "nguoi_van_hanh": "",
  "to_truong": "",
  "ky_thuat": "",
  "tong_san_luong": null,
  "san_luong_loi": null,
  "gio_bat_dau": "",
  "gio_ket_thuc": "",
  "dung_may": [
    {
      "ly_do": "",
      "thoi_gian_phut": null,
      "van_de_chat_luong": "",
      "nguoi_xu_ly": "",
      "tinh_trang": "",
      "ghi_chu": ""
    }
  ]
}

Lưu ý:
- Mã máy: chỉ lấy từ danh sách trên, VD: BBC101, MX02, PKG3, WTR01
- Ca: "Ca 1 (06:00-14:00)", "Ca 2 (14:00-22:00)", hoặc "Ca 3 (22:00-06:00)"
- Thời gian dừng: tính bằng phút (số nguyên)
- Tình trạng lỗi: "Đã xử lý", "Đang xử lý", hoặc "Chưa xử lý"
- Chỉ trả về JSON thuần, không có markdown hay giải thích thêm`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Lỗi API');
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    fillFormFromAI(parsed);
    aiStatus.innerHTML = '<span style="color:#4CAF50">✅ AI đã điền thông tin — hãy kiểm tra lại</span>';
  } catch(e) {
    console.error(e);
    aiStatus.innerHTML = `<span style="color:#F44336">❌ Lỗi: ${e.message}</span>`;
    toast('Lỗi AI: ' + e.message);
  } finally {
    aiBtn.disabled = false;
    aiBtn.textContent = '✨ Phân tích bằng AI';
  }
}

function fillFormFromAI(d) {
  const set = (id, val) => {
    if (!val && val !== 0) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val;
    el.classList.add('ai-filled');
    setTimeout(() => el.classList.remove('ai-filled'), 3000);
  };

  set('f_ma_may',        d.ma_may);
  set('f_ten_may',       d.ma_may); // Set giá trị (mã máy)
  set('f_ngay',          d.ngay || todayStr());
  set('f_ca',            d.ca);
  set('f_nguoi_van_hanh',d.nguoi_van_hanh);
  set('f_to_truong',     d.to_truong);
  set('f_ky_thuat',      d.ky_thuat);
  set('f_tong_san_luong',d.tong_san_luong);
  set('f_san_luong_loi', d.san_luong_loi);
  set('f_gio_bat_dau',   d.gio_bat_dau);
  set('f_gio_ket_thuc',  d.gio_ket_thuc);

  // Cập nhật danh sách lỗi theo máy vừa chọn
  if (d.ma_may) {
    populateErrorList(d.ma_may);
  }

  // Downtime rows
  if (Array.isArray(d.dung_may)) {
    d.dung_may.forEach(dm => {
      if (!dm.ly_do && !dm.thoi_gian_phut) return;
      const idx = addDowntimeRow();
      const setD = (field, val) => {
        if (!val && val !== 0) return;
        const el = document.getElementById(`dt_${field}_${idx}`);
        if (el) { el.value = val; el.classList.add('ai-filled'); setTimeout(() => el.classList.remove('ai-filled'), 3000); }
      };
      setD('ly_do',          dm.ly_do);
      setD('thoi_gian',      dm.thoi_gian_phut);
      setD('chat_luong',     dm.van_de_chat_luong);
      setD('nguoi_xu_ly',    dm.nguoi_xu_ly);
      setD('tinh_trang',     dm.tinh_trang);
      setD('ghi_chu',        dm.ghi_chu);
    });
  }

  toast('AI đã điền thông tin vào form ✅');
}

// ─── DOWNTIME ROWS ────────────────────────────────────────────
function addDowntimeRow() {
  const idx = ++downtimeRowCount;
  document.getElementById('downtimeEmpty').style.display = 'none';

  const div = document.createElement('div');
  div.className = 'downtime-row';
  div.id = 'dtrow_' + idx;
  div.innerHTML = `
    <div class="downtime-row-header">
      🛑 Lần dừng #${idx}
      <button class="btn-remove-row" onclick="removeDowntimeRow(${idx})">✕ Xoá</button>
    </div>
    <div class="downtime-fields">
      <div class="downtime-field full">
        <label>Lý do dừng máy</label>
        <div style="display:flex;gap:6px">
          <input type="text" id="dt_ly_do_${idx}" placeholder="Mô tả hoặc chọn mã lỗi →" style="flex:1" />
          <button class="error-lookup-btn" onclick="openErrorModal(${idx})">🔍 Mã lỗi</button>
        </div>
      </div>
      <div class="downtime-field">
        <label>Thời gian dừng (phút)</label>
        <input type="number" id="dt_thoi_gian_${idx}" placeholder="0" min="0" />
      </div>
      <div class="downtime-field">
        <label>Tình trạng xử lý</label>
        <select id="dt_tinh_trang_${idx}">
          <option value="">— Chọn —</option>
          <option value="Đã xử lý">✅ Đã xử lý</option>
          <option value="Đang xử lý">⏳ Đang xử lý</option>
          <option value="Chưa xử lý">❌ Chưa xử lý</option>
        </select>
      </div>
      <div class="downtime-field">
        <label>Người xử lý</label>
        <input type="text" id="dt_nguoi_xu_ly_${idx}" placeholder="Họ và tên" />
      </div>
      <div class="downtime-field">
        <label>Vấn đề chất lượng</label>
        <input type="text" id="dt_chat_luong_${idx}" placeholder="Nếu có" />
      </div>
      <div class="downtime-field full">
        <label>Ghi chú</label>
        <textarea id="dt_ghi_chu_${idx}" placeholder="Ghi chú thêm nếu cần..."></textarea>
      </div>
    </div>`;
  document.getElementById('downtimeRows').appendChild(div);
  return idx;
}

function removeDowntimeRow(idx) {
  const el = document.getElementById('dtrow_' + idx);
  if (el) el.remove();
  if (!document.getElementById('downtimeRows').children.length) {
    document.getElementById('downtimeEmpty').style.display = '';
  }
}

// ─── ERROR CODE MODAL ─────────────────────────────────────────
function openErrorModal(rowIdx) {
  currentErrorTargetRow = rowIdx;
  document.getElementById('errorSearch').value = '';
  // Lọc lỗi theo máy đã chọn
  const maMay = document.getElementById('f_ma_may').value;
  const errors = ERROR_CODES_BY_MACHINE[maMay] || [];
  renderErrorList(errors);
  document.getElementById('modalErrors').classList.add('open');
}

function closeErrorModal(e) {
  if (e && e.target !== document.getElementById('modalErrors')) return;
  document.getElementById('modalErrors').classList.remove('open');
}

function filterErrors() {
  const q = document.getElementById('errorSearch').value.toLowerCase();
  const maMay = document.getElementById('f_ma_may').value;
  const allErrors = ERROR_CODES_BY_MACHINE[maMay] || [];

  const filtered = allErrors.filter(e =>
    e.code.toLowerCase().includes(q) ||
    e.name.toLowerCase().includes(q) ||
    e.cat.toLowerCase().includes(q)
  );
  renderErrorList(filtered);
}

function renderErrorList(list) {
  const el = document.getElementById('errorList');
  if (!el) return; // Nếu modal chưa tải

  el.innerHTML = list.map(e => `
    <div class="error-item" onclick="selectError('${e.code}', '${e.name}')">
      <span class="error-code">${e.code}</span>
      <div style="flex:1">
        <div class="error-name">${e.name}</div>
        <div class="error-cat">${e.cat}</div>
      </div>
    </div>`).join('');
}

function selectError(code, name) {
  if (currentErrorTargetRow) {
    const el = document.getElementById('dt_ly_do_' + currentErrorTargetRow);
    if (el) el.value = `[${code}] ${name}`;
  }
  document.getElementById('modalErrors').classList.remove('open');
}

// ─── FORM COLLECT ─────────────────────────────────────────────
function collectForm() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const gn = id => parseFloat(document.getElementById(id)?.value) || 0;

  const maMay = g('f_ma_may');
  const tenMay = MACHINES.find(m => m.code === maMay)?.name || '';

  // Gather downtime rows
  const downtimes = [];
  document.querySelectorAll('.downtime-row').forEach(row => {
    const id = row.id.replace('dtrow_', '');
    const ly_do = (document.getElementById('dt_ly_do_' + id)?.value || '').trim();
    const thoi_gian = parseFloat(document.getElementById('dt_thoi_gian_' + id)?.value) || 0;
    if (ly_do || thoi_gian) {
      downtimes.push({
        ly_do,
        thoi_gian_phut: thoi_gian,
        tinh_trang:   (document.getElementById('dt_tinh_trang_' + id)?.value || '').trim(),
        nguoi_xu_ly:  (document.getElementById('dt_nguoi_xu_ly_' + id)?.value || '').trim(),
        chat_luong:   (document.getElementById('dt_chat_luong_' + id)?.value || '').trim(),
        ghi_chu:      (document.getElementById('dt_ghi_chu_' + id)?.value || '').trim(),
      });
    }
  });

  return {
    id: 'REC_' + Date.now(),
    created_at: new Date().toISOString(),
    synced: false,
    ten_may:        tenMay,
    ma_may:         maMay,
    ngay:           g('f_ngay') || todayStr(),
    ca:             g('f_ca'),
    nguoi_van_hanh: g('f_nguoi_van_hanh'),
    to_truong:      g('f_to_truong'),
    ky_thuat:       g('f_ky_thuat'),
    tong_san_luong: gn('f_tong_san_luong'),
    san_luong_loi:  gn('f_san_luong_loi'),
    gio_bat_dau:    g('f_gio_bat_dau'),
    gio_ket_thuc:   g('f_gio_ket_thuc'),
    factory:        config.factory || '',
    downtimes,
  };
}

function validateForm(rec) {
  if (!rec.ma_may) { toast('⚠ Vui lòng chọn Mã máy'); return false; }
  if (!rec.ca) { toast('⚠ Vui lòng chọn Ca làm việc'); return false; }
  return true;
}

// ─── SUBMIT ───────────────────────────────────────────────────
async function submitForm() {
  const rec = collectForm();
  if (!validateForm(rec)) return;

  // Save locally first
  records.push(rec);
  saveRecordsToStorage();
  toast('💾 Đã lưu phiếu thành công!');

  // Attempt sync
  if (config.scriptUrl) {
    syncRecord(rec);
  } else {
    toast('📦 Lưu cục bộ (chưa cài Script URL để đồng bộ Sheets)');
  }

  resetForm();
  loadDashboard();
}

async function syncRecord(rec) {
  try {
    const res = await fetch(config.scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addRecord', data: rec }),
    });
    const json = await res.json();
    if (json.status === 'ok') {
      rec.synced = true;
      saveRecordsToStorage();
      toast('☁️ Đồng bộ Google Sheets thành công!');
    }
  } catch(e) {
    toast('⚠ Lưu cục bộ. Sẽ đồng bộ khi có mạng.');
  }
}

// Retry pending syncs
async function syncPending() {
  if (!config.scriptUrl) return;
  const pending = records.filter(r => !r.synced);
  for (const rec of pending) {
    await syncRecord(rec);
  }
}

// ─── LOCAL STORAGE ────────────────────────────────────────────
function saveRecordsToStorage() {
  const trimmed = records.slice(-500);
  localStorage.setItem('mt_records', JSON.stringify(trimmed));
}

function loadRecordsFromStorage() {
  try {
    records = JSON.parse(localStorage.getItem('mt_records') || '[]');
  } catch(e) { records = []; }
  setTimeout(syncPending, 2000);
}

// ─── RESET FORM ───────────────────────────────────────────────
function resetForm() {
  ['f_ten_may','f_ma_may','f_nguoi_van_hanh','f_to_truong','f_ky_thuat',
   'f_tong_san_luong','f_san_luong_loi','f_gio_bat_dau','f_gio_ket_thuc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('f_ngay').value = todayStr();
  document.getElementById('f_ca').value = '';
  document.getElementById('downtimeRows').innerHTML = '';
  document.getElementById('downtimeEmpty').style.display = '';
  downtimeRowCount = 0;
  clearTranscript();
  populateErrorList();
}

// ─── DASHBOARD ────────────────────────────────────────────────
function loadDashboard() {
  const today = todayStr();
  const todayRecs = records.filter(r => r.ngay === today);

  document.getElementById('s_phieu').textContent = todayRecs.length;
  document.getElementById('s_dung').textContent =
    todayRecs.reduce((s, r) => s + (r.downtimes?.length || 0), 0);
  document.getElementById('s_loi').textContent =
    todayRecs.reduce((s, r) => s + (r.san_luong_loi || 0), 0);

  const machines = [...new Set(todayRecs.map(r => r.ma_may).filter(Boolean))];
  document.getElementById('s_may').textContent = machines.length;

  const container = document.getElementById('machineCards');
  const empty = document.getElementById('dashEmpty');

  if (!machines.length) {
    container.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = machines.map(maMay => {
    const recs = todayRecs.filter(r => r.ma_may === maMay);
    const latest = recs[recs.length - 1];
    const totalDung = recs.reduce((s, r) => s + (r.downtimes?.length || 0), 0);
    const totalLoi  = recs.reduce((s, r) => s + (r.san_luong_loi || 0), 0);
    const totalSL   = recs.reduce((s, r) => s + (r.tong_san_luong || 0), 0);

    let stripe = 'ok';
    if (totalDung >= 3 || totalLoi > 50) stripe = 'err';
    else if (totalDung >= 1 || totalLoi > 0) stripe = 'warn';

    const hasUnresolved = recs.some(r =>
      r.downtimes?.some(d => d.tinh_trang === 'Chưa xử lý' || d.tinh_trang === 'Đang xử lý')
    );

    return `<div class="machine-card" onclick="showMachineDetail('${maMay}', '${today}')">
      <div class="machine-card-stripe ${stripe}"></div>
      <div class="machine-card-body">
        <div class="machine-name">${latest.ten_may || maMay} <span style="font-weight:normal;font-size:12px;color:#888">${maMay}</span></div>
        <div class="machine-meta">Ca: ${latest.ca || '—'} · Vận hành: ${latest.nguoi_van_hanh || '—'}</div>
        <div class="machine-tags">
          <span class="tag tag-blue">SL: ${totalSL.toLocaleString()}</span>
          ${totalLoi ? `<span class="tag tag-orange">Lỗi: ${totalLoi}</span>` : ''}
          ${totalDung ? `<span class="tag tag-red">Dừng: ${totalDung} lần</span>` : '<span class="tag tag-green">Không dừng</span>'}
          ${hasUnresolved ? '<span class="tag tag-red">⚠ Chưa xử lý xong</span>' : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── HISTORY ──────────────────────────────────────────────────
function loadHistory() {
  const date = document.getElementById('histDate').value || todayStr();
  const recs = records.filter(r => r.ngay === date);
  const el = document.getElementById('historyList');
  const empty = document.getElementById('histEmpty');

  if (!recs.length) {
    el.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  el.innerHTML = [...recs].reverse().map(r => {
    const time = new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const syncBadge = r.synced
      ? '<span class="sync-badge sync-ok">☁ Đã sync</span>'
      : '<span class="sync-badge sync-pending">⏳ Cục bộ</span>';
    return `<div class="hist-item" onclick="showDetail('${r.id}')">
      <div class="hist-item-top">
        <div class="hist-item-name">${r.ten_may || r.ma_may || 'Không tên'} ${syncBadge}</div>
        <div class="hist-item-time">${time}</div>
      </div>
      <div class="hist-item-meta">
        Mã: ${r.ma_may || '—'} · ${r.ca || 'Không rõ ca'} · SL: ${r.tong_san_luong || 0}
        ${r.downtimes?.length ? ` · 🛑 ${r.downtimes.length} lần dừng` : ''}
      </div>
    </div>`;
  }).join('');
}

// ─── DETAIL MODAL ─────────────────────────────────────────────
function showDetail(id) {
  const r = records.find(rec => rec.id === id);
  if (!r) return;

  const row = (k, v) => v ? `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>` : '';

  let html = `
    <div class="detail-section">
      <div class="detail-section-title">📌 Thông tin chung</div>
      ${row('Tên máy', r.ten_may)}
      ${row('Mã máy', r.ma_may)}
      ${row('Ngày', r.ngay)}
      ${row('Ca', r.ca)}
      ${row('Người vận hành', r.nguoi_van_hanh)}
      ${row('Tổ trưởng', r.to_truong)}
      ${row('Kỹ thuật', r.ky_thuat)}
      ${row('Tổng sản lượng', r.tong_san_luong)}
      ${row('Sản lượng lỗi', r.san_luong_loi)}
      ${row('Giờ bắt đầu', r.gio_bat_dau)}
      ${row('Giờ kết thúc', r.gio_ket_thuc)}
    </div>`;

  if (r.downtimes?.length) {
    html += `<div class="detail-section"><div class="detail-section-title">🛑 Nhật ký dừng máy</div>`;
    r.downtimes.forEach((d, i) => {
      html += `<div class="downtime-block">
        <strong>Lần ${i+1}</strong><br>
        ${row('Lý do', d.ly_do)}
        ${row('Thời gian', d.thoi_gian_phut ? d.thoi_gian_phut + ' phút' : '')}
        ${row('Tình trạng', d.tinh_trang)}
        ${row('Người xử lý', d.nguoi_xu_ly)}
        ${row('Chất lượng', d.chat_luong)}
        ${row('Ghi chú', d.ghi_chu)}
      </div>`;
    });
    html += '</div>';
  }

  document.getElementById('detailContent').innerHTML = html;
  document.getElementById('modalDetail').classList.add('open');
}

function showMachineDetail(maMay, date) {
  const recs = records.filter(r => r.ma_may === maMay && r.ngay === date);
  if (!recs.length) return;
  const r = recs[recs.length - 1];
  showDetail(r.id);
}

function closeDetail(e) {
  if (e && e.target !== document.getElementById('modalDetail')) return;
  document.getElementById('modalDetail').classList.remove('open');
}

// ─── TOAST ────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
